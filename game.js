/*
    Jacob Sanchez
    3/2/2025
    CS-382
    JavaScript functionality for Connect-4 Multiplayer Game:
    - Simple representation of game state with script objects.
    - Uses DOM to manipulate attached HTML document to represent the game state.
    - Also uses requestAnimationFrame to animate the pieces falling as they're placed.
*/

/*
    2D array representation of the 7x6 Connect Four Board:
    List of columns (lists of rows)

        For columns: 0->6 is left->right
        For rows: 0->5 is down->up

    Possible values of cells:
        0 = Blank
        1 = Red Player Token
        2 = Blue Player Token
*/

const board = [
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0]
];

var currentPlayer = "Red";
var redScore = 0;
var blueScore = 0;

//Restarts game or round.
//Postcondition: If gameReset is true the entire game is reset, otherwise scores are preserved
//and only the board itself is reset.
function restartGame(gameReset){
    //console.log("Player turn has ended");
    for (let x = 0; x < 7; x++){
        for(let y = 0; y < 6; y++){
            board[x][y] = 0;
            updateBoardImage(x, y, 0, false);
        }
    }
    updateTurn("Red")
    if(gameReset){
        redScore = 0;
        blueScore = 0;
        let scoreText = document.getElementById('BlueScore');
        scoreText.innerHTML = blueScore;
        scoreText = document.getElementById('RedScore');
        scoreText.innerHTML = redScore;
    }
}

// Prevents default action -- Is for some reason necessary to allow drag and dropping.
function allowDrop(event){
    event.preventDefault();
}

// Places a token at the specified column. Called by drag and drop action from html.
async function placeToken(column){
    //console.log("Token placed at " + column);

    column = parseInt(column);

    //console.log("It is " + currentPlayer + "'s turn");

    let selectedColumn = board[column]; //Get's the actual board column.

    //Get's the first blank spot in the column to check if it's full.
    //If column full, function exits without any consequence allowing player to make a different move.
    if (selectedColumn[selectedColumn.length - 1] != 0){
        //console.log("Column full try again");
        return -1;
    }

    //Get's the bottom-most valid spot to place a token in column.
    let row = 0;
    while(selectedColumn[row] != 0) row++;

    //Queues up the next player and calls function to update the board (which also calls the animation function)
    //To ensure the game is 'paused' for the animation await is used (which is also why this function is async).
    let nextPlayer;
    if (currentPlayer == "Red"){
        selectedColumn[row] = 1;
        await updateBoardImage(column, row, 1, true);
        nextPlayer = "Blue";
    }
    else{ 
        selectedColumn[row] = 2;
        await updateBoardImage(column, row, 2, true);
        nextPlayer = "Red";
    }

    //After the board has been updated, check victory conditions.
    //On win, add to score and reset the board state and turn order.
    let winState = checkwin(column, row);
    if(winState == 1){
        alert(currentPlayer + " has won.");
        let scoreText;
        if (currentPlayer == "Red"){
            redScore++;
            scoreText = document.getElementById('RedScore');
            scoreText.innerHTML = redScore;
        }
        else{
            blueScore++;
            scoreText = document.getElementById('BlueScore');
            scoreText.innerHTML = blueScore;
        }
        restartGame(false);
        return;
    }

    //If no one's won yet, change turn and keep the game going.
    updateTurn(nextPlayer);
    //document.getElementById("TurnText").innerHTML = "Currently it is " + currentPlayer + "'s turn"
}

// Animates the connect four token being dropped from the placement bar to it's final resting position.
// PRECONDITION: Takes the type of token piece, and the ELEMENT of it's final location (i.e the blank token it will overlap).
// POSTCONDITION: A new element is created which falls in place before being deleted as he blank is changed to the corresponding token.
function animatePlacement(piece, location){
    // Everything is wrapped in a promise so that the rest of the game's functions can be paused as it occurs.
    return new Promise(function(resolve) {
        //First disables all buttons.
        const buttons = document.querySelectorAll("button");
        buttons.forEach(btn => btn.disabled = true);

        //Disables the draggable token so players can't preemptively take turns.
        const dragToken = document.getElementById("DragToken");
        dragToken.draggable = false;

        let duration = 1000; //Anything less than 1s seems to cause significant frame tearing on chrome browsers
        
        //Creates the new token to be animated.
        const animToken = document.createElement("img");
        animToken.style.position = "fixed";
        animToken.id = "AnimToken";
        if (piece == 1) animToken.src = "media/RedToken.png";
        else if (piece == 2) animToken.src = "media/BlueToken.png";;

        //Gets bounding boxes for the drag zone (start pos) and blank token (end pos) for animation coordinates.
        let startTopElem = document.getElementsByClassName("dropZone")[0];
        let startRect = startTopElem.getBoundingClientRect();
        let endRect = location.getBoundingClientRect();

        let startY = startRect.top;
        let endY = endRect.top;

        //Aligns new token horizontally with blank at the place bar on the respective drag zone.
        animToken.style.left = endRect.left + 'px';
        animToken.style.top = startY + 'px';
        animToken.style.maxWidth = "85px";
        animToken.style.zIndex = "1000";

        animToken.style.top = startRect.top + 'px';

        document.body.appendChild(animToken)

        //Dynaimically updates the x and y positions of token in case user scrolls or moves window.
        function updateEndPos(){
            endRect = location.getBoundingClientRect();
            curX = endRect.left;
            endY = endRect.top;
            return [curX, endY];
        }

        let startTime = false;

        //Recursive requestAnimationLoop for actually animating the token drop.
        function dropFrames(timestamp){
            if (!startTime) startTime = timestamp;
            let elapsedTime = timestamp - startTime;

            //Get's the current progress as a decimal of the elapsed time over duration.
            let progress = Math.min( (elapsedTime/duration), 1 );

            const coords = updateEndPos();
            let curX = coords[0];
            let endY = coords[1];

            //Use's linear extrapolation to create a smooth animation.
            let currentY = startY + (endY - startY) * progress;

            animToken.style.top = currentY + 'px';
            animToken.style.left = curX + 'px';

            //Keep's recursively calling method until progress reaches 1 (100%)
            if (progress < 1) {
                requestAnimationFrame(dropFrames);
            } else {
                //Deletes created token and restores game functionality:
                animToken.remove();
                buttons.forEach(btn => btn.disabled = false);
                dragToken.draggable = true;
                resolve(); //Resolve the promise
            }
        }

        requestAnimationFrame(dropFrames);
    });    
}

//Updates the board's HTML representation of the board to match the javascript object.
//PRECONDITION: Takes the coordinates and type of piece it needs to update alongside whether an animation should be played or not.
//POST: The board is updated.
async function updateBoardImage(column, row, piece, animate){
    //Everything is wrapped in a promise so that the game pauses for the animation's completion.
    return new Promise(async function(resolve) {
        const table = document.getElementById('GameBoard');
        const dragPiece = document.getElementById('DragToken');
        tableColumns = table.rows;
        
        //Ensures tokens are placed from bottom -> up.
        let token = tableColumns[(5 - row)].cells[column];

        if(animate) await animatePlacement(piece, token.children[0]);

        //Depending on type of piece update the board to use respective token img.
        //Also update the dragPiece to use the next players token for the turn change.
        if (piece == 1){
            token.children[0].src = "media/RedToken.png";
            dragPiece.src = "media/BlueToken.png";
        }
        else if (piece == 2){
            token.children[0].src = 'media/BlueToken.png';
            dragPiece.src = "media/RedToken.png";
        }
        // Board is being reset
        else if (piece == 0){
            token.children[0].src = 'media/BlankToken.png';
            dragPiece.src = "media/RedToken.png";
        }
        resolve();
    });
}

// On turn switch update all variables and html properties dependent on player.
function updateTurn(nextPlayer){
    currentPlayer = nextPlayer;
    turnText = document.getElementById("TurnText");
    turnText.innerHTML = "Currently it is " + currentPlayer + "'s turn";
    turnText.style.color = currentPlayer;
}

// On token being placed, check the board (from that token's coords) to see if there is 4 in a row
// in any direction.
// POST: Returns 1 if game is won, returns 0 if it isn't.
function checkwin(col, row){
    col = parseInt(col);
    row = parseInt(row);
    let piece = 0;
    if (currentPlayer == "Red") piece = 1;
    else piece = 2;

    let consecutive = 0; //Checks consecutively placed pieces

    //Check horizontal -- First left then right
    let i = col
    while (i >= 0 && board[i][row] == piece){
        consecutive++;
        i--;
    }
    i = parseInt(col) + 1;
    while (i < 7 && board[i][row] == piece){
        consecutive++;
        i++;
    }
    if (consecutive >= 4){
        //console.log(currentPlayer + " Won!!! -- Horizontal");
        return 1;
    }
    
    //Check vertical -- Up and down
    consecutive = 0;
    i = row;
    while (i >= 0 && board[col][i] == piece){
        consecutive++;
        i--;
    }
    i = parseInt(row) + 1;
    while (i < 6 && board[col][i] == piece){
        consecutive++;
        i--;
    }
    if (consecutive >= 4){
        //console.log(currentPlayer + " Won!!! -- Vertical");
        return 1;
    }

    //Check diagonal -- X
    consecutive = 0;
    //TL -> BR first: From pos to TL then from pos to BR:
    let y = row;
    let x = col;
    while(x >= 0 && y < 6 && board[x][y] == piece){
        consecutive++;
        y++;
        x--;
    }
    y = row - 1;
    x = col + 1;
    while(x < 7 && y >= 0 && board[x][y] == piece){
        consecutive++;
        y--;
        x++;
    }
    if (consecutive >= 4){
        //console.log(currentPlayer + " Won!!! -- Top-Left to Bot-Right Diagonal");
        return 1;
    }

    //BL -> TR second: From pos to BL then from pos to TR:
    consecutive = 0;
    y = row;
    x = col;
    while(x >= 0 && y >= 0 && board[x][y] == piece){
        consecutive++;
        y--;
        x--;
    }
    y = row + 1;
    x = col + 1;
    while (x < 7 && y < 6 && board[x][y] == piece){
        consecutive++;
        y++;
        x++;
    }
    if (consecutive >= 4){
        //console.log(currentPlayer + " Won!!! -- Bot-Left to Top-Right Diagonal");
        return 1;
    }
    
    return 0;
}