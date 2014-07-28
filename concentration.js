

if (document.getElementById && document.createElement)
	{
		// *** Global Variables ***********************************************			
		
		//Note: variables beginning with $ are jQuery objects.
		var singleMode = false; // flags single player mode
		var adjTileWidth = 100; var adjTileHeight = 65; // dimensions including borders; used to calculate positions
		var numRows = 6; var numCols = 5; // could be altered to change number of tiles, dimensions would need adjusting	
		
		var unmatched = []; //array of unmatched numbers			
		
		var responseInterval = 400; // how long to wait before changing message
		var tilePair = new Array(); // used to hold and test two choices
		var compareInterval = 2250; // time to wait after showing the second tile
		
		var suppress = false;  // used to suppress picking additional tiles. Set to true when second tile is picked; cleared on mismatch,or response to solution request
		var doubleWild = false // flag to indicate matching Wild Cards
		var finalGuess = false; // flag indicating this is the last guess.
		var replay = false;    // flag indicating a replay
		
		//DOM references
		var $board = $('#board')
		var formDOMref = document.getElementById('puzzleform');
		var $solutionform = $('#puzzleform')
		var solutionVisible = false; //tracks whether the solution form is visible.
		
		var $message = $('#message')
		var $giveup = $('#giveup')		
		
		//Level 0 references to forms
		var formref = document.puzzleform; //Level 0 reference to solution form
		var playerform = document.playerform //player names
		
		var $playerform = $('#playerform')
		
		var puzzleCount = 0
		
		var playeridx = 0 //holds index number of current player
		var otheridx = 1 //holds index number of opponent
		
		var Players = new Array() //array to hold player names
		var prizelists = new Array();//array to hold DOM references to ULs that hold prizes
		var transferState = null //used to indicate a take or forfeit state. Null otherwise
		var matchcount = 0; //Number of pieces matched. Used to find end of game.			
		
		var prizeCount = [0,0]//Number of prizes each player has in their rack.
		
		
		
		// Facilitate using the query string
		var urlScope = {}
		if (window.location.search) 
			{
				var qstring = window.location.search.slice(1); // lop off the question mark
				var qArray = qstring.split('&');
				
				var thisvalpair; //establishing
				for (i = 0; i < qArray.length; i++)
					{
						thisvalpair = qArray[i].split('=');
						if (thisvalpair.length < 2) {urlScope[thisvalpair[0]] = true} //if no value passed, assume it's a flag of true
						else {urlScope[thisvalpair[0]] = thisvalpair[1]} //set the value as the key value						
					}
			}
		var initialState = 'num'
		if(urlScope.initialState) {initialState = urlScope.initialState} // Debug -- allow setting initial state of board
		
		//raw list of puzzles
		var puzzleArray = new Array(); //enumerating elements separately for easier updates.			   
			//each item is an object with img, explantion and answer properties
			puzzleArray[0] = {img:"pzzl006.gif",  	explanation:"Eye + Th + Ink, + Th + Ear + 4 + I + Ham",	answer:"I think, therefore I am"}
			puzzleArray[1] = {img:"pzzl005.gif", 	explanation:"2 + Bee + Or + Knot + 2 + Bee",	answer:"To be, or not to be"}
			puzzleArray[2] = {img:"pzzl003.gif", 	explanation:"Hat + Bee + N + Hoo + Y + Ear",	answer:"Happy New Year"}
			puzzleArray[3] = {img:"pzzl004.gif", 	explanation:"SP + Ace, The F + Eye + N + Awl + Fr + ON + T + Ear",	answer:"Space, the final frontier"}
			puzzleArray[4] = {img:"pzzl007.gif", 	explanation:"The + Fan + Ton + M + Off + The + Up + Rah",	answer:"The Phantom of the Opera"}
		
		//raw lists of prizes		
		var coolPrizes = ['Jewelry','Washer/Dryer','Hair Dryer','Wallet','Year of HBO','Shopping Spree','Disney World Trip','15\" MacBook Pro','Trip to Bonaire','Recliner','Dinette Set','Honda VFR 750','Sofa','CamCorder','Home Theater','Digital SLR','Kayak','Surf Board','Media Center','Motor Home','iPod Touch','Snowmobile','Jet Ski','Sailboat','Scuba Equipment','iPad','Kindle', 'Cannondale Bicycle','Television','Green House','iTunes Gift Card','Snowblower','SUP','Flowers','Hat','Linens','Artist Supplies']
		var gagPrizes = ['Watermelon','Razor','Kleenex','Lemon','Socks','Paint Brush','Compost','Penny for Thoughts','Sea Shell','Trunk of Junk','Tub of Lard']
		var utilPrizes = ['Take','Forfeit','Forfeit','Forfeit','Wild']
					
		//array used to randomize the prizes;
		var prizeArray = new Array(); var curridx;
		
		// *** END: Global Variables ******************************************
		
		
		//function to sort the an array containing objects with a rand property
		function sortObjects(a,b)
			{
				return a.rand - b.rand
			}		
	  
	   
		//constructor function for puzzle objects. Takes an rawpuzzleObj, and adds some properties
	   function Puzzle(rawpuzzleObj)
		{
			this.src = 'rebus/' + rawpuzzleObj.img;
			this.explanation = rawpuzzleObj.explanation;
			this.solution = rawpuzzleObj.answer;
			this.compareString = this.solution.replace(/\W/gi,'')
			this.compareString = this.compareString.toLowerCase();		   		
			this.rand = Math.random();
		}	   
			
		var finalPuzzleArray = new Array();
		for (var pz = 0 ; pz < puzzleArray.length; pz++)
			{
				finalPuzzleArray[pz] = new Puzzle(puzzleArray[pz])		    		
			}
			
		//sort the puzzle array by the rand property of each puzzle 	
		 finalPuzzleArray.sort(sortObjects);
		 
		 var thisPuzzle = finalPuzzleArray[puzzleCount] //Pick off the first puzzle
		 var bgPath = thisPuzzle.src
		
		
		//**** Prize functions ************************************************
		
		//constructor function for Prize object;  each object holds a prizename and a random number.
		function prizeObject(prizename)
			{
				if(typeof prizename == 'object' && prizename.prizename) //replay case	
					{
						prizename = prizename.prizename
					}
				this.prizename = prizename;
				this.rand = Math.random()
			}
			
		
		
		//function to add prize to scoreboard
	   function addPrizeToScoreBoard(prizeText)
		{
			var $parentUL = prizelists[playeridx];
			var $newLI = $(document.createElement('LI'));
			$newLI.text(prizeText)
			$newLI.click(transferPrize)
			$parentUL.append($newLI)		   		
			prizeCount[playeridx]++;
		}
		
		
		//function to faciliate taking and forfeiting gifts. Here, 'this' is the li representing a prize.
		function transferPrize()
			{
				if ((transferState == 'Take' && this.parentidx == playeridx) || (transferState == 'Forfeit' && this.parentidx == otheridx)) {transferState = null}
				if (transferState == null) {return false}
				else
					{
						idxToUse = (transferState == 'Take') ? playeridx :otheridx;
						oppositeidx = (transferState == 'Take') ? otheridx :playeridx;

						prizeCount[idxToUse]++;
						prizeCount[oppositeidx]--;

						prizelists[idxToUse].append(this);
						transferState = null;	    			   

						$message.text('Can you tell us what the puzzle says?')
					}
			}
		
		//**** END: Prize functions ************************************************			
			
			
			
		function revealBoard(clearBoth)
			{
				var $allTrilons = $('.trilon')
				$allTrilons.attr('data-state','pzl'); // set all numbers to the puzzle state
				if(clearBoth)
					{
						var myPrizes = prizelists[playeridx]
						myPrizes.empty()
					}
				if (!singleMode)	//clear out opponent's prize rack
					{
						var opponentPrizes = prizelists[(playeridx == 0) ? 1: 0]
						opponentPrizes.empty()
					}
				
			   //show explanation
			   var $explanation = $('#explanation')
			   $explanation.text('(' + thisPuzzle.explanation +')')
			   $explanation.show();
			   $giveup.fadeOut()
			   
			   $('#playagain-div').fadeIn(400)				   
			}
			
		// Function to test to see if we have a match	
		 function testPrizes()
			{
				transferState = null; //reset the flag used for prize transfers
				//alert('Prize 0 = ' + tilePair[0].prizename + '\nPrize 1 = ' + tilePair[1].prizename)
				var match = (tilePair[0].prizename == tilePair[1].prizename) || (tilePair[0].prizename == 'Wild')  || (tilePair[1].prizename == 'Wild');
				suppress = true //disallow clicking until we take action
				var myAction = function() {actOnMatch(match)}
				var x = setTimeout(myAction,compareInterval)	
				$message.text((match) ? 'That\'s correct' : 'Sorry, that\'s not a match')
			}
			
			
		function actOnMatch(match)
			{
				if (!doubleWild)
					{
					for (var i = 0; i < tilePair.length; i++) 
						{
							if (match) {var state = 'pzl';} 
							else {var state = 'num';}
							$(tilePair[i]).attr('data-state',state) //turn trilon to the correct state by setting data attribute								
						}
					}
				if(match)
					{
					   matchcount++;
					   otheridx = (playeridx == 0) ? 1 : 0
					   prizeWon = tilePair[0].prizename;
					   // Pull numbers off the unmatched Array
					   for(var n=0; n < 2; n++)
						{
							unmatched.splice(unmatched.indexOf(tilePair[n].id),1)
						}
						  
					   if (!doubleWild && tilePair[0].prizename == 'Wild')//handle single Wild Card case where Wild Card is first number chosen.
						{
							prizeWon = tilePair[1].prizename;
						}
						switch (prizeWon)
							{
								case 'Take':
									{
										if (prizeCount[otheridx] > 0)
											{
												$message.text(Players[playeridx] +', you may take one of ' + Players[otheridx] + '\'s prizes')
												transferState = 'Take';
											}
										else
											{
												$message.text(Players[otheridx] +' has no prizes to take. Can you tell us what the puzzle says?')
											}
										break	;
									}
							   case 'Forfeit':
									{
										if (prizeCount[playeridx] > 0)
											{
												
												$message.text(Players[playeridx] +', you must give ' + Players[otheridx] + ' one of your prizes');
												transferState = 'Forfeit';
											}
										else 
											{
												$message.text('You have no prizes to forfeit. Can you tell us what the puzzle says?')
											}
										break;
									}
								default: 
									{
										$message.text('Can you tell us what the puzzle says?')
										addPrizeToScoreBoard(prizeWon);
										break;
									}
							}
						
						showSolutionForm()
					}
				else
					{
						suppress = false; // allow more numbers to be chosen
						if(!singleMode)
							{
								playeridx = (playeridx == 0)? 1:0;
								var timedMsg = function(){$message.text(Players[playeridx] + ', your turn.')}
								var y = setTimeout(timedMsg,responseInterval)
							}
						else {$message.text('Try Again.')}
					}
					
				tilePair.length = 0
				
			}	
			
			
					
		function noMoreMatches()
			{
				suppress = true; // stop the clicking
				$('.trilon').attr('data-state','pzl') // expose full Puzzle
				
				finalGuess = true; // 
				
				if(singleMode) {
					$message.text('There are no more matches. Enter the solution, or click the Give Up button to end the game.');
					$('#nobtn').val('Give Up')
					showSolutionForm();
					}
				else
					{
						$message.text('Here\'s the full puzzle. Use the button with your name to enter the solution.')
						$('#endform').fadeIn(400)
						$('#endform input').click(acceptName)
						
					}			
			
			}
		
		//Function to accept the final solution name
		function acceptName()
			{
				playeridx = $(this).attr('data-playeridx');
				otheridx = (playeridx == 1)? 0:1;
				$message.text(Players[playeridx] +', enter your solution, or use the Cancel button to give ' + Players[otheridx] + ' a chance to solve it')
				$('#nobtn').val('Cancel')
				$('#endform').fadeOut(400,showSolutionForm)	
				return false;				
				
			}
			
		
		//function to test for and handle an unsolvable end of game case
		function checkMatchable()
			{
				switch (unmatched.length)
					{
						case 0: {noMoreMatches(); break;}
						case 2: 
							{
								var p0= $('#' + unmatched[0]).attr('data-prize')
								var p1= $('#' + unmatched[1]).attr('data-prize')
								
								if(p0 != p1) {noMoreMatches();}
								break;
							}
						default: return true;
					}
			}
		
		// Function to hide the puzzle solution form
		function hideSolutionForm()
			{
				$solutionform.fadeOut(200,checkMatchable);
				solutionVisible = false;
			}
			
		// Function to reveal the puzzle solution form; also focuses that field
		function showSolutionForm()
			{
				suppress = false
				$solutionform.fadeIn(200, function(){document.puzzleform.solution.focus()});
				solutionVisible = true;
			}				
			
		/* Function to handle submissions from the solution form. If OK button used, checks solution;
		   Otherwise, takes action based on value of button pressed. */
			
		function handleGuesses()
			{
				switch(this.value)
					{
						case 'OK':
							{
								var solutionString = formref.solution.value.replace(/\W/gi,'')
								solutionString = solutionString.toLowerCase() //strip out non-alphabetical characters, and set to lower case, for less strict checking.
								//alert(solutionString + '\n' + thisPuzzle.compareString)
								if (solutionString == thisPuzzle.compareString)
									{
										revealBoard();
										$message.text('That\'s right! Congratulations!');
										return false;
									}
							
								else
									{
										$message.text('Sorry, that\'s incorrect. It\'s still your turn.');
										formref.solution.value = '';
									}
								hideSolutionForm();
								break; // end 'OK'
							}
						case 'Cancel' :
							{
								playeridx = (playeridx == 0) ? 1: 0;
								$message.text(Players[playeridx] + ' give it a try')
								$('#solution').val('')
								$('#nobtn').val('Give Up');
								break
							}
						case 'Give Up': 
							{
								giveUp()
								break
							}
						default:
							{
								if(singleMode) { var prefix = ''}
								else {var prefix = Players[playeridx] +', it\'s still your turn. '}
								$message.text(prefix +'Pick two more pieces of the puzzle.');
								formref.solution.value = '';
								hideSolutionForm()
							}
					
					} // end, switch
				
				
				
				suppress = finalGuess; //allow play to continue if not the final guess.
				return false;
			}
			
		// Function to turn an individual number to the prize face
		function turnToPrize()
			{					
				if (suppress) return;
				var $this = $(this)
				var currentState = $this.attr('data-state') 
				if(currentState!= 'num' && currentState != initialState) {return;} // bail if not turned to the number face 
				if(solutionVisible) {hideSolutionForm()}				
				$this.attr('data-state','prize')
				this.prizename = $this.attr('data-prize')
				
				tilePair[tilePair.length] = this;
				if (tilePair.length == 2) {testPrizes()}
			}	
		
		
		// Constructor function for the rotating trilon object for each number
		function Trilon(row,col)
			{
				var trilon = $(document.createElement("DIV"));
				var $trilon = $(trilon)
				$trilon.addClass('trilon row' + row + ' col' + col);
				
				$trilon.number = trilon.number = (row * numCols) + (col + 1);
				
				var prizename = prizeArray[trilon.number - 1].prizename
				$trilon.prop('id','nt' + trilon.number)
				$trilon.attr('data-state',initialState);
				$trilon.attr('data-prize',prizename);
				$trilon.append('<div class="face num"><div class="inner">'+ trilon.number +'</div></div>')
				//$trilon.append('<div class="face prize"><div class="inner">iPhone 5c</div></div>')
				var $prize = $(document.createElement('DIV'))
				$prize.addClass("face prize")
				var innerprize = document.createElement('DIV');
				
				var $innerprize = $(innerprize)
				$innerprize.addClass('inner')
				switch(prizename)
					{
						case 'Wild': 
							{
								$innerprize.addClass('wildcard');
								$innerprize.text('Wild Card');
								break;
							}
						case 'Take':
						case 'Forfeit':
							{
								$innerprize.append('<div class="transfer">' + prizename +'</div> One Gift');
								break;
							}
						default:
							{
								$innerprize.text(prizename);
							}
					} //end, switch
				$prize.append($innerprize)
				$trilon.append($prize)
				var pzl = document.createElement('DIV');
				pzl.className = "face pzl";
				
				var bgtop = -1 * (row * adjTileHeight) + 'px';
				var bgleft = -1 * (col * adjTileWidth) + 'px';
				
				pzl.style.backgroundImage = 'url(' + bgPath + ')';
				pzl.style.backgroundPosition = bgleft + ' ' + bgtop;
				
				//pzl.style.backgroundPosition = '-100px 100px';					
				$trilon.append(pzl)
				$trilon.click(turnToPrize)					
				return trilon
				
			}
			
		// Method to give up the game. Called by the End Game button and the give up button present on the form at the end.	
		function giveUp()
		  	{
				$message.text('The puzzle says, \"' + thisPuzzle.solution + '\"')
				revealBoard(true)
				$solutionform.fadeOut(200); // fade out solution form, but don't recheck.
		  	}
			
		 // Event handler on End Game Button
		 $giveup.click(giveUp)
	   
		 
		/* ====================================================================================
		   Main initialization function -- called on submit of the player name form 
		   ==================================================================================== */
		function initialize()
			{
				if(singleMode) //If single player mode, define a single player
					{
						Players[0] = ''
					}
				else // otherwise, validate that we have both names
					{
						if (playerform.player1name.value == '' || playerform.player2name.value == '')
							{
							 alert('Please enter a name for both players.');
							 return false;
							}							
						Players[0] = playerform.player1name.value
						Players[1] = playerform.player2name.value	
					}		
								
				// Restore form to empty state to facilitate next game
				//playerform.player1name.value = '';
				//playerform.player2name.value = '';
				
				// Fade out the player form, fade in the game board.
				$(this).fadeOut(400,function(){
															$('#game-set').fadeIn(800);
														})
				
				
				
				//initialize the scoreboard
			   var parentdiv,$parentdiv,namediv,nametext,plist
			   var $scoreboard = $('#scoreboard')	
			   
			   if(!replay) //on initial play, set up scoreboard
				{
						for (i= 0; i < Players.length; i++)
							{
								parentdiv = document.createElement('DIV')
								parentdiv.id = 'p' + i;
								parentdiv.className = 'playerprizes';
								$scoreboard.append(parentdiv)
								$parentdiv = $(parentdiv)
								if(!singleMode) 
									{
										$parentdiv.append('<h2>' + Players[i] + '</h2>')
										$('#pickPlayer' + i).val(Players[i])
									 }
								else {$parentdiv.append('<h2>Prizes</h2>')}
								plist =  document.createElement('UL');//generate the lists for the prizes, put them in an array for easy reference, and add them to the DOM
								prizelists[i] = $(plist)
								$parentdiv.append(plist)
								if(singleMode) {$scoreboard.addClass('single')} // TODO : Adjust, use vars							
							}	
				}
			   
				
				
				//initialize prizes
				//Convert each of the "cool" prizes to an object, then sort.
				for (var i = 0 ; i < coolPrizes.length; i++)
					{
						coolPrizes[i] =  new prizeObject(coolPrizes[i]) // adds a rand property to each prize
					}
				coolPrizes.sort(sortObjects)
				//alert(coolPrizes.length)
				
				for (var i = 0 ; i < gagPrizes.length; i++)
					{
						gagPrizes[i] =  new prizeObject(gagPrizes[i]) // adds a rand property to each prize
					}
				gagPrizes.sort(sortObjects)
				
				
				if(singleMode) 
					{
						utilPrizes = ['Wild']; // Take and Forfeit are meaningless in single mode.
						goodPrizeCount = 12 // Compensate for absent transfer prizes
					} 
			   else
				{
					goodPrizeCount = 8;
				}
				for (var i = 0 ; i < utilPrizes.length; i++)
					{
						utilPrizes[i] =  new prizeObject(utilPrizes[i]) // adds a rand property to each prize
					}
				utilPrizes.sort(sortObjects)
				
				var rawPrizeArray = []  //start with the utility prizes
				for(up = 0 ; up < utilPrizes.length; up++) {rawPrizeArray.push(utilPrizes[up])}
				for (cp = 0 ; cp < goodPrizeCount; cp++) {rawPrizeArray.push(coolPrizes[cp])}//pick off the first 10 or 12 cool prizes
				for (gp = 0 ; gp < 2; gp++) {rawPrizeArray.push(gagPrizes[gp])}//pick off the first 2 gag prizes
				
				prizeArray = [];
				
				//loop through the raw prize array, and create two Prize objects for each prize name					
				for (var i = 0 ; i < rawPrizeArray.length; i++)
					{
						for ( var j = 0; j < 2; j++)
							{
								curridx = (i * 2) + j; 
								prizeArray[curridx] = new prizeObject(rawPrizeArray[i].prizename) // adds a rand property to each prize
							}
						//prizelist += rawPrizeArray[i].prizename + '\n'
					}
				//sort the array according to the value of each element's rand property	
				prizeArray.sort(sortObjects) // This is what assigns the the prizes randomly to specific numbers
					
			   // initialize game board. 
				for (row = 0; row < numRows; row++)
					{
						for (col = 0; col < numCols; col++)
						{
							thisTrilon = new Trilon(row,col);
							$board.append(thisTrilon)
							unmatched.push(thisTrilon.context.id) //This tracks unmatched numbers
						}
					}
				
				formref.solution.value = ''; //reset the solution field to blank
				
				//add event handlers to buttons
				var puzzleButtons = formDOMref.getElementsByTagName('INPUT')
				for (i = 0; i < puzzleButtons.length; i++)
					{
						if(puzzleButtons[i].type == 'submit') puzzleButtons[i].onclick = handleGuesses
					}
			if(singleMode){$message.text('Please begin the game by choosing two pieces of the puzzle.');}
			else{$message.text(Players[playeridx] + ', please begin the game by choosing two pieces of the puzzle.');}    
		 
				return false
			}
			
	   // Function to play another round 
	   function playAgain()
		{
			replay= true;
			
			$('#playagain-div').fadeOut()
			$('#explanation').fadeOut()
			$('.trilon').attr('data-state','num') // this will make all trilons rotate to the number face. We're going to re-create them, but I want the visual reset.
			
			prizelists[0].empty()
			if(!singleMode){prizelists[1].empty()}
			prizeArray = []; 
			prizeCount = [0,0] //reset prize counts
			unmatched = []
			$giveup.fadeIn()
					
			function actualReset()
				{
					puzzleCount++
					if(puzzleCount == finalPuzzleArray.length) {puzzleCount = 0}
					thisPuzzle = finalPuzzleArray[puzzleCount];
					bgPath = thisPuzzle.src;			
					$('#board').empty()					
					initialize.call($playerform);		
				}
			setTimeout(actualReset,1600) //run the reset code after allowing the visual reset
				   		
		}
	   
	   $('#playagain').click(playAgain)
	   $playerform.submit(initialize)
	   $(document).ready(function(){$playerform.fadeIn(1000)})
	}//end master DOM check.