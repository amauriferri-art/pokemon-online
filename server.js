// server.js - O Coração do PokeLife (MMO Completo)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { calculateDamage } = require('./battleEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

let waitingPlayer = null; 
const activeBattles = {};

io.on('connection', (socket) => {
    console.log(`[PokeLife] Treinador conectado: ${socket.id}`);

    socket.on('findMatch', (playerData) => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const roomId = `battle_${socket.id}_${waitingPlayer.id}`;
            socket.join(roomId);
            waitingPlayer.socket.join(roomId);

            activeBattles[roomId] = {
                player1: { 
                    id: waitingPlayer.id, 
                    username: waitingPlayer.username, 
                    pokemon: waitingPlayer.pokemon,
                    hp: waitingPlayer.stats.hp,
                    maxHp: waitingPlayer.stats.hp,
                    stats: waitingPlayer.stats,
                    types: waitingPlayer.types
                },
                player2: { 
                    id: socket.id, 
                    username: playerData.username, 
                    pokemon: playerData.pokemon,
                    hp: playerData.stats.hp,
                    maxHp: playerData.stats.hp,
                    stats: playerData.stats,
                    types: playerData.types
                },
                turn: waitingPlayer.id 
            };

            io.to(roomId).emit('matchFound', { 
                roomId, 
                firstTurn: waitingPlayer.id,
                p1: activeBattles[roomId].player1,
                p2: activeBattles[roomId].player2
            });
            waitingPlayer = null;
        } else {
            waitingPlayer = { ...playerData, id: socket.id, socket: socket };
            socket.emit('waiting', { message: 'A procurar oponente no ecrã de radar...' });
        }
    });

    socket.on('useAttack', (data) => {
        const battle = activeBattles[data.roomId];
        if (!battle || battle.turn !== socket.id) return; 

        const attacker = battle.player1.id === socket.id ? battle.player1 : battle.player2;
        const defender = battle.player1.id === socket.id ? battle.player2 : battle.player1;

        // Calcula o dano no back-end para evitar hackers
        const result = calculateDamage(attacker.stats, defender.stats, data.move, attacker.types, defender.types);
        
        // Desconta a vida
        defender.hp -= result.damage;
        if (defender.hp < 0) defender.hp = 0;

        let logMsg = `${attacker.username} usou ${data.move.name.toUpperCase()}! `;
        if (result.isCritical) logMsg += 'Um golpe crítico! ';
        if (result.effectiveness) logMsg += result.effectiveness;

        // Passa o turno
        battle.turn = defender.id;

        io.to(data.roomId).emit('battleLog', {
            log: logMsg,
            nextTurn: battle.turn,
            damageDone: result.damage,
            attackerId: attacker.id,
            defenderId: defender.id,
            defenderHp: defender.hp,
            defenderMaxHp: defender.maxHp
        });

        // Verifica condição de vitória
        if (defender.hp === 0) {
            io.to(data.roomId).emit('matchEnd', {
                winner: attacker.username,
                loser: defender.username,
                log: `${defender.pokemon.toUpperCase()} desmaiou! ${attacker.username} venceu a batalha!`
            });
            delete activeBattles[data.roomId]; // Limpa a sala da memória
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
        // Lógica de W.O se fechar a aba a meio da batalha
        for (const roomId in activeBattles) {
            const battle = activeBattles[roomId];
            if (battle.player1.id === socket.id || battle.player2.id === socket.id) {
                const winnerName = battle.player1.id === socket.id ? battle.player2.username : battle.player1.username;
                io.to(roomId).emit('matchEnd', {
                    winner: winnerName,
                    log: `O adversário fugiu da batalha. ${winnerName} ganha por abandono!`
                });
                delete activeBattles[roomId];
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`[PokeLife] Servidor MMO Online na porta ${PORT}! 🚀`);
});