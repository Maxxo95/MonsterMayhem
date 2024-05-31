

async function handleBattles(gameState, currentPlayer, gamePlayers, {
    row: toRow,
    col: toCol,
    opponentMonster: destinationMonster,
    playerMonster,
    fromRow,
    fromCol,
    playerMonsters,
    playerEliminations
}) {

    if (!playerMonster || !destinationMonster) {
        console.log('Error: Missing monsters for battle');
        return;
    }
    // Extract playerType and opponentType using lastIndexOf method
    const playerType = playerMonster.split('.')[1];
    const opponentType = destinationMonster.split('.')[1];
    const oponent = destinationMonster.split('.')[0];
    const username = playerMonster.split('.')[0];
    // Log the extracted monster types for debugging
    console.log(`Player Type: ${playerType}, Opponent Type: ${opponentType}`);

    // Perform battle based on the extracted monster types

    // Perform battle based on the extracted monster types
    if ((playerType === 'Vampire' && opponentType === 'Werewolf') ||
        (playerType === 'Werewolf' && opponentType === 'Ghost') ||
        (playerType === 'Ghost' && opponentType === 'Vampire')) {
        // Opponent's monster is removed
        console.log(`${destinationMonster} defeated by ${playerMonster}`);
        gameState.board[toRow][toCol] = playerMonster;
        gameState.board[fromRow][fromCol] = null;
        gameState.playerEliminations[oponent]++;
        gameState.playerMonsters[oponent]--;
    } else if ((opponentType === 'Vampire' && playerType === 'Werewolf') ||
        (opponentType === 'Werewolf' && playerType === 'Ghost') ||
        (opponentType === 'Ghost' && playerType === 'Vampire')) {
        // Player's monster is removed
        console.log(`${playerMonster} defeated by ${destinationMonster}`);
        gameState.board[fromRow][fromCol] = null;
        gameState.playerEliminations[username]++;
        gameState.playerMonsters[username]--;
    } else if (playerType === opponentType) {
        // Both monsters are removed
        console.log(`${playerMonster} and ${destinationMonster} destroy each other`);
        gameState.board[toRow][toCol] = null;
        gameState.board[fromRow][fromCol] = null;
        gameState.playerEliminations[username]++;
        gameState.playerMonsters[username]--;
        gameState.playerEliminations[oponent]++;
        gameState.playerMonsters[oponent]--;
    } else {
        console.log('Battle inconclusive');
    }
    // Notify players about the battle outcome
    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
        ...gameState,
        message: `Battle occurred at ${String.fromCharCode(65 + toCol)}${toRow + 1}`
    })));

}


module.exports = handleBattles;