////////////////////////////////////
////////////////////////////////////
function createBoard() {
    const board = document.getElementById('gameBoard');
    board.style.gridTemplateColumns = '50px repeat(10, 50px) 30px';
    board.style.gridTemplateRows = '50px repeat(10, 50px) 30px';

    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    const emptyCorner = document.createElement('div');
    emptyCorner.classList.add('cell', 'header');
    board.appendChild(emptyCorner);

    for (let col = 0; col < 10; col++) {
        const headerCell = document.createElement('div');
        headerCell.classList.add('cell', 'header');
        headerCell.textContent = columns[col];
        board.appendChild(headerCell);
    }

    const emptyTopRight = document.createElement('div');
    emptyTopRight.classList.add('cell', 'header');
    board.appendChild(emptyTopRight);

    for (let row = 0; row < 10; row++) {
        const rowHeader = document.createElement('div');
        rowHeader.classList.add('cell', 'header');
        rowHeader.textContent = row + 1;
        board.appendChild(rowHeader);

        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.index = `${columns[col]}${row + 1}`;
            cell.addEventListener('click', () => handleCellClick(row, col));
            board.appendChild(cell);
        }

        const rightRowHeader = document.createElement('div');
        rightRowHeader.classList.add('cell', 'header');
        board.appendChild(rightRowHeader);
    }

    const emptyBottomLeft = document.createElement('div');
    emptyBottomLeft.classList.add('cell', 'header');
    board.appendChild(emptyBottomLeft);

    for (let col = 0; col < 10; col++) {
        const bottomHeaderCell = document.createElement('div');
        bottomHeaderCell.classList.add('cell', 'header');
        board.appendChild(bottomHeaderCell);
    }

    const emptyBottomRight = document.createElement('div');
    emptyBottomRight.classList.add('cell', 'header');
    board.appendChild(emptyBottomRight);
}
module.exports = createBoard;