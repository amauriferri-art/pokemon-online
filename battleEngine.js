// battleEngine.js - Motor de Cálculo Profissional PokeLife (Gen 1 Completa)

const typeChart = {
    normal: { rock: 0.5, ghost: 0 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, bug: 2, rock: 0.5, ghost: 0.5 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 2, flying: 0.5, psychic: 2, ghost: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2 },
    ghost: { normal: 0, psychic: 0, ghost: 2 },
    dragon: { dragon: 2 }
};

function getTypeMultiplier(moveType, targetTypes) {
    let multiplier = 1;
    targetTypes.forEach(type => {
        if (typeChart[moveType] && typeChart[moveType][type] !== undefined) {
            multiplier *= typeChart[moveType][type];
        }
    });
    return multiplier;
}

function calculateDamage(attackerStats, defenderStats, move, attackerTypes, defenderTypes) {
    if (!move || move.power === null || move.power === 0) {
        return { damage: 0, effectiveness: 'O ataque não causou dano direto.', isCritical: false };
    }

    const level = 50; 
    const isSpecial = ['water', 'grass', 'fire', 'ice', 'electric', 'psychic', 'dragon'].includes(move.type);
    
    // Status Gen 1
    const a = isSpecial ? attackerStats.spAtk : attackerStats.attack;
    const d = isSpecial ? defenderStats.spDef : defenderStats.defense;

    // Same Type Attack Bonus
    const isStab = attackerTypes.includes(move.type) ? 1.5 : 1;
    const typeAdvantage = getTypeMultiplier(move.type, defenderTypes);

    // Probabilidade de Crítico (Aproximadamente 6.25% na Gen 1)
    const isCritical = Math.random() < 0.0625;
    const critModifier = isCritical ? 1.5 : 1;

    const random = (Math.floor(Math.random() * (100 - 85 + 1)) + 85) / 100;

    let damage = Math.floor(((((2 * level / 5) + 2) * move.power * (a / d)) / 50) + 2);
    damage = Math.floor(damage * isStab * typeAdvantage * critModifier * random);

    let effectivenessMsg = '';
    if (typeAdvantage >= 2) effectivenessMsg = 'Foi super efetivo!';
    else if (typeAdvantage === 0) effectivenessMsg = 'Não teve efeito nenhum...';
    else if (typeAdvantage < 1) effectivenessMsg = 'Não foi muito efetivo...';

    return {
        damage: damage,
        effectiveness: effectivenessMsg,
        isCritical: isCritical
    };
}

module.exports = { calculateDamage };