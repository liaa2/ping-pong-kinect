const states = {
  servedWaitingForBounce: function( ball ){

    if( crossed_net(ball) || passSides(ball) || hitNet(ball) ){
      return 'outOtherSideWins';
    } else if( touchTable(ball) ){
      return 'servedBouncedOwnSide';
    }

    return 'servedWaitingForBounce';
  },

  },
  servedBouncedOwnSide: function( ball ){

    return 'servedBouncedOwnSide';
  },

  // this is the start of a cycle (a rally)
  crossedNetWatingForBounce: function( ball ){

    return 'crossedNetWatingForBounce';
  },

  crossedNetBouncedOnCrossedToSide: function( ball ){

    return 'crossedNetBouncedOnCrossedToSide';
  },

  // ball has been hit:
  returnStartedStillOnReturnSide: function( ball ){
    if( touchTable(ball) || passSides(ball) || hitNet(ball) ){
      return 'outOtherSideWins';
    }
    if( crossed_net(ball) ){
      return 'crossedNetWatingForBounce';
    }

    return 'returnStartedStillOnReturnSide'
  },
}

// for each animation frame:
// i.e. currentState = 'servedWaitingForBounce';
// i.e. lastHitter = 'AI';

// possibly change state by running the state update test function,
// which either returns a new state, a WIN state, or the same state (no change)
currentState = states[currentState]( ball );

// test if you should switch which player is the last to hit
if(currentState === 'returnStartedStillOnReturnSide'){
  lastHitter = swap(lastHitter); // lastHitter === 'HUMAN' ? 'AI' : 'HUMAN'
}
