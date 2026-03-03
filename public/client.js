// client.js - O Cliente Definitivo PokeLife (Dentro da pasta 'public')

const socket = io(); 

let myTurn = false;
let myRoomId = null;
let playerPokemonData = null;
let myMoves = [];

const logElement = document.getElementById('battle-log');
const username = sessionStorage.getItem('pokeLifeUsername');

if (!username) window.location.href = 'index.html';

document.getElementById('player-name').innerText = username;

async function fetchRandomGen1Pokemon() {
    const randomId = Math.floor(Math.random() * 151) + 1;
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
    return await response.json();
}

async function fetchMoveDetails(url) {
    const res = await fetch(url);
    return await res.json();
}

async function initializeGame() {
    logElement.innerText = "A capturar o teu Pokémon inicial...";
    
    playerPokemonData = await fetchRandomGen1Pokemon();
    document.getElementById('player-sprite').src = playerPokemonData.sprites.back_default || playerPokemonData.sprites.front_default;
    
    // Organiza os status para o servidor
    const stats = {
        hp: playerPokemonData.stats[0].base_stat * 3, // Multiplicado para a batalha durar mais tempo
        attack: playerPokemonData.stats[1].base_stat,
        defense: playerPokemonData.stats[2].base_stat,
        spAtk: playerPokemonData.stats[3].base_stat,
        spDef: playerPokemonData.stats[4].base_stat,
        speed: playerPokemonData.stats[5].base_stat
    };
    const types = playerPokemonData.types.map(t => t.type.name);

    document.getElementById('player-hp-text').innerText = `${stats.hp} / ${stats.hp}`;
    document.getElementById('player-hp').style.width = '100%';

    logElement.innerText = "A analisar os ataques...";

    // Puxa os dados completos dos primeiros 4 golpes para enviar a Power e Type para o servidor
    for(let i = 0; i < 4; i++) {
        const btn = document.getElementById(`move-${i+1}`);
        if(playerPokemonData.moves[i]) {
            const moveData = await fetchMoveDetails(playerPokemonData.moves[i].move.url);
            
            myMoves[i] = {
                name: moveData.name,
                power: moveData.power,
                type: moveData.type.name
            };

            btn.innerText = moveData.name.replace('-', ' ');
            
            btn.onclick = () => {
                if(!myTurn) {
                    logElement.innerText = "Não é o teu turno! Aguarda.";
                    return;
                }
                
                socket.emit('useAttack', {
                    roomId: myRoomId,
                    move: myMoves[i]
                });
                myTurn = false; 
            };
        } else {
            btn.innerText = "-";
            btn.onclick = null;
        }
    }

    logElement.innerText = `Lado a lado com um ${playerPokemonData.name.toUpperCase()}! A procurar adversário...`;
    
    socket.emit('findMatch', { 
        username: username, 
        pokemon: playerPokemonData.name,
        stats: stats,
        types: types
    });
}

socket.on('waiting', (data) => {
    logElement.innerText = data.message;
    document.getElementById('enemy-name').innerText = "À procura...";
});

socket.on('matchFound', async (data) => {
    myRoomId = data.roomId;
    myTurn = data.firstTurn === socket.id;
    
    const opponentData = data.firstTurn === socket.id ? data.p2 : data.p1;
    
    logElement.innerText = `Desafiado por ${opponentData.username}! \n${myTurn ? "Tu atacas primeiro!" : "O adversário ataca primeiro!"}`;
    
    // Puxa a imagem do Pokémon do adversário da API usando o nome exato
    const enemyRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${opponentData.pokemon}`);
    const enemyJson = await enemyRes.json();

    document.getElementById('enemy-name').innerText = opponentData.username;
    document.getElementById('enemy-sprite').src = enemyJson.sprites.front_default;
    document.getElementById('enemy-hp').style.width = '100%';
});

socket.on('battleLog', (data) => {
    logElement.innerText = data.log;
    
    // Identifica quem levou o dano para piscar a imagem e reduzir a barra de HP
    if (data.defenderId === socket.id) {
        // Eu levei dano
        const playerImg = document.getElementById('player-sprite');
        playerImg.classList.add('shake');
        setTimeout(() => playerImg.classList.remove('shake'), 300);

        const hpPercent = (data.defenderHp / data.defenderMaxHp) * 100;
        document.getElementById('player-hp').style.width = `${hpPercent}%`;
        document.getElementById('player-hp-text').innerText = `${data.defenderHp} / ${data.defenderMaxHp}`;
    } else {
        // O Inimigo levou dano
        const enemyImg = document.getElementById('enemy-sprite');
        enemyImg.classList.add('shake');
        setTimeout(() => enemyImg.classList.remove('shake'), 300);

        const hpPercent = (data.defenderHp / data.defenderMaxHp) * 100;
        document.getElementById('enemy-hp').style.width = `${hpPercent}%`;
    }
    
    myTurn = (data.nextTurn === socket.id);
    
    setTimeout(() => {
        logElement.innerText += `\n${myTurn ? "É a tua vez!" : "Aguardar movimento do adversário..."}`;
    }, 2000);
});

socket.on('matchEnd', (data) => {
    myTurn = false; // Bloqueia comandos
    logElement.innerText = `${data.log}\n\nA regressar ao ecrã inicial em 5 segundos...`;
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 5000);
});

window.onload = initializeGame;