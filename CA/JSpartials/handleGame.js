
const handleBattles = require('./handleBattles');  // Import the handleBattles function 
const { MongoClient } = require('mongodb'); // Import the MongoClient class from the mongodb module
const uri = 'mongodb://localhost:27017'; // Connection URI
async function handleGame(gameState, gamePlayers, viewCount) { //Async funtion for handling the game on separete thread
    let winner = "";
    while (winner === "") { // Continue the game until a winner is determined
        const currentPlayer = gamePlayers.find(player => player.username === gameState.currentPlayer); // 
        // Initialize or reset actions at the start of the turn
        gameState.currentTurnActions = {
            moves: 0,
            placements: 0
        };

        await new Promise(resolve => { // Turn loop of players
            const messageHandler = async (message) => {
                const msgObj = JSON.parse(message);

                if (msgObj.username !== gameState.currentPlayer) {
                    return;
                }

                if (msgObj.type === 'makeMove') { // Handle player moves
                    const { action, monster, row, col, fromRow, fromCol, toRow, toCol } = msgObj;
                    console.log(`Received move: ${JSON.stringify(msgObj)}`); // Debug log

                    if (action === 'place' && gameState.currentTurnActions.placements < 1) { // Players can place 1 mosnter per turn
                        if (gameState.board[row][col] === null) {
                            console.log(`Placing ${monster} at (${row}, ${col})`); // Debug log
                            gameState.board[row][col] = monster;
                            gameState.playerMonsters[gameState.currentPlayer]++;
                            gameState.playerMonsterPositions[gameState.currentPlayer].push({ row, col, monster });
                            gameState.currentTurnActions.placements++;
                            console.log(`Placement successful. Current placements: ${gameState.currentTurnActions.placements}`); // Debug log
                        } else {  //Else if the cell is already occupied
                            console.log(`Failed to place ${monster} at (${row}, ${col}): Cell is occupied`); // Debug log
                            currentPlayer.ws.send(JSON.stringify({
                                message: `Invalid placement: Cell ${String.fromCharCode(65 + col)}${row + 1} is already occupied.`
                            }));
                        }
                        //Moving player monsters 
                    } else if (action === 'move' && gameState.currentTurnActions.moves < gameState.playerMonsterPositions[gameState.currentPlayer].length) {
                        const destinationMonster = gameState.board[toRow][toCol];
                        if (destinationMonster === null) {
                            console.log(`Moving ${monster} from (${fromRow}, ${fromCol}) to (${toRow}, ${toCol})`); // Debug log
                            gameState.board[fromRow][fromCol] = null;
                            gameState.board[toRow][toCol] = monster;

                            const monsterIndex = gameState.playerMonsterPositions[gameState.currentPlayer]
                                .findIndex(m => m.row === fromRow && m.col === fromCol && m.monster === monster);
                            if (monsterIndex > -1) {
                                gameState.playerMonsterPositions[gameState.currentPlayer][monsterIndex] = { row: toRow, col: toCol, monster };
                                gameState.currentTurnActions.moves++;
                                console.log(`Move successful. Current moves: ${gameState.currentTurnActions.moves}`); // Debug log
                            }
                            /// IF monsters are of different players, then initiate battle      
                        } else if (destinationMonster && !destinationMonster.startsWith(currentPlayer.username[0])) {
                            console.log(`Initiating battle: ${monster} vs ${destinationMonster} at (${toRow}, ${toCol})`); // Debug log

                            const playerMonsters = gameState.playerMonsters[currentPlayer.username];
                            const playerEliminations = gameState.playerEliminations[currentPlayer.username];

                            handleBattles(gameState, currentPlayer, gamePlayers, {
                                row: toRow,
                                col: toCol,
                                opponentMonster: destinationMonster,
                                playerMonster: monster,
                                fromRow: fromRow,
                                fromCol: fromCol,
                                playerMonsters: playerMonsters,
                                playerEliminations: playerEliminations
                            });
                            // For each player, check if they have been eliminated from the game
                            const eliminatedPlayers = Object.entries(gameState.playerEliminations).filter(([username, count]) => count >= 1);
                            eliminatedPlayers.forEach(([username]) => {
                                console.log(`${username} has been eliminated from the game.`);
                                gameState.players = gameState.players.filter(player => player !== username);
                                gamePlayers = gamePlayers.filter(player => player.username !== username);

                                // Notify all players about the elimination
                                gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                                    ...gameState,
                                    message: `${username} has been eliminated from the game.`
                                })));
                            });
                            ///////// If only one player is left, then declare the winner
                            if (gameState.players.length === 1) {
                                winner = gameState.players[0];
                                console.log(`${winner} has won the game!`);
                                const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true }); // modify to newst version
                                viewCount += 1;
                                try { // Write victory on the database
                                    await client.connect();
                                    const db = client.db('MonsterMayhemUsers');
                                    const users = db.collection('users');

                                    await users.updateOne(
                                        { username: winner },
                                        { $inc: { gamesWon: 1 } }
                                    )
                                }
                                catch (error) {
                                    console.error('Error connecting to MongoDB:', error);
                                } finally {
                                    await client.close();
                                }
                                // Notify all players about the winner
                                gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                                    ...gameState,
                                    message: `${winner} has won the game!`
                                })));

                                return winner; // End the game
                            }
                        }

                        else {
                            console.log(`Failed to move ${monster} to (${toRow}, ${toCol}): Cell is occupied by own monster`); // Debug log
                            currentPlayer.ws.send(JSON.stringify({
                                message: `Invalid move: Destination cell ${String.fromCharCode(65 + toCol)}${toRow + 1} is already occupied by your own monster.`
                            }));
                        }
                    }

                    // Broadcast the updated game state
                    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                        ...gameState,
                        message: `${gameState.currentPlayer} ${action === 'place' ? 'placed' : 'moved'} a ${monster} ${action === 'place' ? `at ${String.fromCharCode(65 + col)}${row + 1}` : `from ${String.fromCharCode(65 + fromCol)}${fromRow + 1} to ${String.fromCharCode(65 + toCol)}${toRow + 1}`}`
                    })));
                } else if (msgObj.type === 'endTurn' && msgObj.username === gameState.currentPlayer) {
                    console.log(`Ending turn for player: ${gameState.currentPlayer}`); // Debug log

                    gameState.currentTurn++;
                    const nextPlayerIndex = (gameState.players.indexOf(gameState.currentPlayer) + 1) % gameState.players.length;
                    gameState.currentPlayer = gameState.players[nextPlayerIndex];

                    // Notify all players of the new current player
                    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                        currentPlayer: gameState.currentPlayer,
                        message: `It is now ${gameState.currentPlayer}'s turn`
                    })));

                    currentPlayer.ws.off('message', messageHandler); // Remove the message listener
                    resolve(); // Proceed to the next turn
                }
            };

            currentPlayer.ws.on('message', messageHandler);
        });
    }
}



module.exports = handleGame; // Export the handleGame function