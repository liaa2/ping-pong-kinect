 var app = app || {};

 app.gameState = {
   currentState: 'servedWaitingForBounce', //TODO: better state for first
   lastHitBy: 'AI',
   winner: '',
   winStyle: '',
   score: {
     human: 0,
     AI: 0
   }
 };

//animation
app.animate = () => {
  app.humanStart();
  app.easyMode();
  app.updateAI();

  if( !app.gameState.winner && app.config.doBallUpdate){
     app.updateBall();
     app.updateGameState( app.gameState, app.ball );
     app.updateDebugGUI( app.gameState );
  }

  app.stats.update();

  app.matchScoreCheck();

  if (app.particleSystem) {
    app.animateParticles();
  }

  app.renderer.render( app.scene, app.camera );
  requestAnimationFrame(app.animate);
}; // animate()

app.updateGameState = (state, ball) => {
  let currentState = state.currentState;
  let newState = '';
  const stateUpdater = app.stateMachine[ currentState ]; // get the updater method

  // 1. Update state by running update method for current state,
  // which either returns a new state or the same state
  // NOTE: these update methods also check for ball bounces and update ball position, last hit state, etc
  newState = stateUpdater( state, ball );

  if( newState === currentState ){
    return; // Return early if there is no change in state, i.e. skip the win test
  }

  state.currentState = newState;  // set new state back to global state object

  console.log(`%c ${currentState} -> ${newState}`, 'color: green; font-size: 10pt; font-weight: bold');

  // 2. Test if a win state has been reached
  if( app.checkAndHandleWin(state) ){
    app.config.doBallUpdate = false;
    // TODO: call correct win function here
  }

};


//add Stats
app.addStats = () => {
  const stats = new Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';

  document.body.appendChild(stats.domElement);

  return stats;
};


//AI paddle moves
app.updateAI = () => {
  // try to match ball X position as soon as it's moving in direction of AI player
  if (app.ball.velocity.z < 0 ){
    app.paddleAI.position.x = app.ball.position.x;
    app.paddleAI.position.y = app.ball.position.y;
  }
}


//human turn to hit the ball and start the game
app.humanStart = () => {
  if (app.winner === "AI" && app.withinBounceRange(app.ball, app.paddle) && (app.paddle.position.z - app.ball.position.z) < 3 && app.ball.velocity.z === 0) {
    app.ball.velocity.z = app.paddle.velocity.z * app.config.humanHitVelocityScale ;
    app.winner = "";
    app.justHit = "human";
    app.pointHasBegun = true;
  }
};

//reset global variables for new game and after each point
app.setting = () => {
  app.paddleAI.rotation.x = 0;
  app.paddleAI.rotation.y = 0;
  app.justServed = true;
  app.hasBouncedOnOppositeSide = false;
  app.addPoint = true;
  app.bounce = 0;
}

//new game starts
app.newGame = () => {

  document.getElementById("scores").innerHTML = "0 - 0";
  document.getElementById("message").innerHTML = "First to " + app.winningScore + " scores wins!";

  if (app.particleSystem) {
    app.particleSystem.geometry.dispose();
    app.particleSystem.material.dispose();
    app.scene.remove(app.particleSystem);
  }

  app.cheering.pause();

  if( app.winner === "AI" ){
    // human starts
    app.ball.position.set(0, 30, 150);

  } else {
    app.ball.position.set(0, 30, -150);
    app.ball.velocity.set(0, 0, 1.3);
    app.winner = "";
  }

  app.setting();
  app.paddle.rotation.x = 0;
  app.paddle.rotation.y = 0;
  const scale = app.planeWidth/100;
  app.paddle.scale.set(scale, scale, scale);
  app.paddleAI.scale.set(scale, scale, scale);

  app.aiScore = 0;
  app.humanScore = 0;
  app.activeParticle = true;
}


//Next Point
app.restartRound  = () =>  {
  document.getElementById("message").innerHTML = " "

  app.setting();
  app.paddleAI.position.y = 30;

  // AI is serving
  app.ball.position.set(Math.random()*101-50, 30, -app.planeLength/2);
  app.paddleAI.position.x = app.ball.position.x;

  app.aiPaddleSound.play();

  app.ball.velocity.set(0, 0, 1.3);

  app.justHit = "AI";  // reset last-hit tracker
};

//Ping pong ball moves
app.updateBall = () => {
  const pos = app.ball.position;
  const paddle = app.paddle.position;

  // app.guiControls.rollDebug = app.nextTurn;

  // apply gravity
  app.ball.velocity.y -= app.guiControls.gravity;
  // apply velocity to position
  app.ball.position.x += app.ball.velocity.x * app.guiControls.ballVelocityScale;
  app.ball.position.z += app.ball.velocity.z * app.guiControls.ballVelocityScale;
  app.ball.position.y += app.ball.velocity.y;

  // clamp Y, no sinking through table
  app.ball.position.y = Math.max(2, app.ball.position.y);
  
};

//easy mode to help user find ball position (x axis and y axis)
app.easyMode = () => {
  if (app.guiControls.easyMode && app.ball.velocity.z > 0 ) {
    app.paddle.position.x = app.ball.position.x;
    app.paddle.position.y = app.ball.position.y;
  }
}


//create, animate and add particle System to the scene
app.createParticleSystem = () => {

  const particles = new THREE.Geometry();

  const dist = app.guiControls.particleDistribution;

  for (var i = 0; i < app.guiControls.numParticles; i++) {

    const particle = new THREE.Vector3(
      THREE.Math.randInt(-dist, dist),
      THREE.Math.randInt(-dist, dist),
      -300
    )

    particle.vx = 0;
    particle.vy = 0;
    particle.vz = 0;


    particles.vertices.push(particle)
  }// for

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 500,
    map: THREE.ImageUtils.loadTexture('img/cracker.gif'),
    blending: THREE.NormalBlending,
    transparent: true,
    alphaTest: 0.5
  });

  const particleSystem = new THREE.Points(particles, particleMaterial);

  return particleSystem;
}

app.animateParticles = () => {
  const particles = app.particleSystem.geometry.vertices;

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];

    const distSquared = (particle.x * particle.x)
                      + (particle.y * particle.y)
                      + (particle.z * particle.z);


    if (distSquared > 6.0) {
      const force = (10.0/distSquared) * -0.02;
      particle.vx += force * particle.x;
      particle.vy += force * particle.y;
      particle.vz += force * particle.z;
    }

     particle.x += particle.vx * app.guiControls.particleVelocityScale;
     particle.y += particle.vy * app.guiControls.particleVelocityScale;
     particle.z += particle.vz * app.guiControls.particleVelocityScale;
  }

  app.particleSystem.geometry.verticesNeedUpdate = true;
}

app.showParticleSystem = () => {
  if (app.winner && app.activeParticle) {
    app.particleSystem = app.createParticleSystem();
    app.scene.add(app.particleSystem);
    app.activeParticle = false;
  }
};


//check winning condition
app.matchScoreCheck = () => {
  let paddle;
  // if either one reaches 5 points
  if (app.aiScore >= app.winningScore) {
    app.winner = "AI";
    app.nextTurn = "human";
    app.aiScore = app.winningScore;
    paddle = app.paddleAI;
    app.ball.velocity.set(0,0,0);
    app.ball.position.set(0,2,-app.planeLength/2)
    // write to the banner
    document.getElementById("scores").innerHTML = "AI wins!";
    document.getElementById("message").innerHTML = "Press enter to play again";
    //audience cheering
    app.cheering.play();
    // make paddle rotates
    app.step++;
    paddle.position.z = -170;
    paddle.rotation.y = Math.sin(app.step * 0.1) * 15;
    // enlarge and squish paddle
    paddle.scale.z = 2 + Math.abs(Math.sin(app.step * 0.1)) * 3;
    paddle.scale.x = 2 + Math.abs(Math.sin(app.step * 0.05)) * 3;
    paddle.scale.y = 2 + Math.abs(Math.sin(app.step * 0.05)) * 3;

    //particle system
    app.showParticleSystem();

  } else if (app.humanScore >= app.winningScore) {
    app.winner = "human";
    app.nextTurn = "AI";
    app.humanScore = app.winningScore;
    paddle = app.paddle;
    app.ball.velocity.set(0,0,0);
    app.ball.position.set(0, 2, app.planeLength/2)
    // write to the banner
    document.getElementById("scores").innerHTML = "Human wins!";
    document.getElementById("message").innerHTML = "Press enter to play again";
    app.cheering.play();
    // make paddle bounce up and down
    app.step++;
    paddle.rotation.y = Math.sin(app.step * 0.1) * 15;
    // enlarge and squish paddle
    paddle.scale.z = 2 + Math.abs(Math.sin(app.step * 0.1)) * 3;
    paddle.scale.x = 2 + Math.abs(Math.sin(app.step * 0.05)) * 3;
    paddle.scale.y = 2 + Math.abs(Math.sin(app.step * 0.05)) * 3;

    app.showParticleSystem();
  }
};

//update scores helper method
app.updateScores = () => {
  app.justHit === "AI"? app.humanScore ++ : app.aiScore ++ ;
  document.getElementById("scores").innerHTML = app.aiScore + " - " + app.humanScore;

  setTimeout(app.restartRound, 1000);
}


// STILL USED
//check if ball is within the paddle/AI paddle range, just x and y position
app.withinBounceRange = (ball, paddle) => {
  return (
    ball.position.x >= (paddle.position.x - app.paddleWidth/2)
    && ball.position.x <= (paddle.position.x + app.paddleWidth/2)
    && ball.position.y >= (paddle.position.y - app.paddleWidth/2)
    && ball.position.y <= (paddle.position.y + app.paddleWidth/2)
  );
};

////////////// New methods

app.stateMachine = {
  // states handled:
  // servedWaitingForBounce
  // servedBouncedOwnSide
  // crossedNetWatingForBounce
  // crossedNetBouncedOnCrossedToSide
  // returnStartedStillOnReturnSide

  // TODO: do all these methods need both state & ball arguments?

  servedWaitingForBounce: function( state, ball ){

    if( app.crossedNet( ball, state.lastHitBy ) || app.passedSides(ball) || app.hitNet(ball) ){
      return 'outLastHitterLoses';
    }

    if( app.touchedTable(ball) ){
      ball.velocity.y *= -1;  // reflect ball
      return 'servedBouncedOwnSide';
    }

    return 'servedWaitingForBounce';  // no change
  },

  servedBouncedOwnSide: function( state, ball ){

    if( app.passedSides(ball) || app.hitNet(ball) || app.touchedTable(ball) ){
      return 'outLastHitterLoses';
    }

    if( app.crossedNet( ball, state.lastHitBy ) ){
      return 'crossedNetWatingForBounce';
    }

    return 'servedBouncedOwnSide';  // no change
  },

  // This is the potential start of a cycle (a rally)
  // i.e.: crossedNetWatingForBounce -> crossedNetBouncedOnCrossedToSide -> returnStartedStillOnReturnSide -> crossedNetWatingForBounce

  crossedNetWatingForBounce: function( state, ball ){

    if( app.passedSides(ball) ){
      return 'outLastHitterWins';
    }

    if( app.touchedTable(ball) ){
      ball.velocity.y *= -1;   // reflect ball
      return 'crossedNetBouncedOnCrossedToSide';
    }

    return 'crossedNetWatingForBounce';  // no change
  },

  crossedNetBouncedOnCrossedToSide: function( state, ball ){

    if( app.passedSides(ball) || app.touchedTable(ball) ){
      return 'outLastHitterWins';
    }

    // Ball hit by a paddle?
    if( app.touchedPaddle(ball, state.lastHitBy) ){

      state.lastHitBy = app.otherPlayer( state.lastHitBy );  // change lastHitBy

      // bounce ball based on paddle hit
      if( state.lastHitBy === 'human' ){
        app.humanPaddleHit( ball );
      } else {
        app.aiPaddleHit( ball );
      }

      return 'returnStartedStillOnReturnSide';
    }


    return 'crossedNetBouncedOnCrossedToSide';  // no change
  },

  // state, ball has been hit:
  returnStartedStillOnReturnSide: function( state, ball ){
    if( app.touchedTable(ball) || app.passedSides(ball) || app.hitNet(ball) ){
      return 'outLastHitterLoses';  //note!
    }

    if( app.crossedNet( ball, state.lastHitBy ) ){
      return 'crossedNetWatingForBounce';
    }

    return 'returnStartedStillOnReturnSide'  // no change
  }

}; // stateMachine


// Ball test functions

app.crossedNet = ({position: {z}}, lastHitBy) => {
  // console.log('crossedNet(): ', {lastHitBy, z}, lastHitBy === "human"  ?  z < 0  :  z > 0);
  return lastHitBy === "human"  ?  z < 0  :  z > 0;
};

app.passedSides = ({ position: {x,z} }) => {
  return Math.abs(x) > app.widthBoundary || Math.abs(z) > app.lengthBoundary;
};

app.hitNet = ({ position: {x,y,z} }) => {
  // more strict test than passedSides() because we don't include a margin
  return Math.abs(z) < app.netTouchThreshold && Math.abs(y) < app.net.position.y && Math.abs(x) < app.planeWidth/2;
};

app.touchedTable = ball => {
  return ball.position.y <= app.tableTouchThreshold && ball.velocity.y < 0;
};

app.touchedPaddle = (ball, lastHitBy) => {
  const nextHitter = app.otherPlayer( lastHitBy );
  const paddle = app.getPaddle( nextHitter ); // This should be easier

  // TODO: why do we care about the velocity? DRY up this code
  if(nextHitter === 'AI') {
    return ball.velocity.z < 0  &&  (paddle.position.z - ball.position.z) >  -4  &&  app.withinBounceRange(ball, paddle);
  } else {
    // nextHitter ===  'human'
    return ball.velocity.z > 0  &&  (paddle.position.z - ball.position.z) < 4  &&  app.withinBounceRange(ball, paddle);
  }
};

app.otherPlayer = player => {
  return player === 'human' ? 'AI' : 'human';
};

app.getPaddle = player => {
  // TODO: if the paddles have the same keys as the player string,
  // i.e. 'app.paddles.human' and 'app.paddles.AI' ....then we can just write: 'app.paddles[player]'
  return player === 'human' ? app.paddle : app.paddleAI;
};

app.updateDebugGUI = state => {
  app.guiControls.lastHitBy = state.lastHitBy;
  app.guiControls.currentState = state.currentState;
  app.guiControls.winner = state.winner;
  app.guiControls.winStyle = state.winStyle;
};

app.checkAndHandleWin = state => {
  console.log('checkAndHandleWin():', state);
  if( state.currentState === 'outLastHitterLoses' ){
    state.winner = app.otherPlayer( state.lastHitBy );
    console.log('WINNER (other): ', state.winner);
  } else if( state.currentState === 'outLastHitterWins' ){
    state.winner = state.lastHitBy;
    console.log('WINNER: ', state.winner);
  } else {
    console.log('no winner');
    return false;
  }
};

app.humanPaddleHit = ball => {
  const paddle = app.paddle;
  let normalMatrix = new THREE.Matrix3().getNormalMatrix( app.surface.matrixWorld );
  let normalizedNormal = app.surface.geometry.faces[0].normal.clone().applyMatrix3( normalMatrix ).normalize();
  ball.velocity.reflect( normalizedNormal );
  ball.velocity.z += paddle.velocity.z * app.config.humanHitVelocityScale;
  ball.velocity.y += 2; // lukeh cheat

  // play the sound, but only until the velocity is negative again (prevent playing too long)
  ball.position.y > 0 ? app.humanPaddleSound.play(): app.humanPaddleSound.pause();
};

app.aiPaddleHit = ball => {
  const paddle = app.paddleAI;
  let normalMatrix = new THREE.Matrix3().getNormalMatrix( app.surfaceAI.matrixWorld );
  let normalizedNormal = app.surfaceAI.geometry.faces[0].normal.clone().applyMatrix3( normalMatrix ).normalize();

  //adjust AI paddle x axis rotation based on ball's height - paddle tilt up or down
  paddle.rotation.x = THREE.Math.mapLinear(
    ball.position.y,
    - 20, 100,
    -Math.PI/4, Math.PI/4
  );

  //calculate paddle.rotation.x angle based on y position, then calculate bounce back speed based on angle

  //adjust AI paddle y axis rotation based on ball's x position - keep the ball bounce on the table
  if (ball.position.x >= 0 &&  ball.position.x < app.planeWidth/2 + 100) {
    paddle.rotation.y = THREE.Math.mapLinear(
      ball.position.x,
      0, app.planeWidth/2,
      0, - Math.PI/6
    )
    paddle.rotation.y = THREE.Math.clamp(paddle.rotation.y, 0, - Math.PI/6);
  } else if (ball.position.x < 0 && ball.position.x > -app.planeWidth/2 - 100) {
    paddle.rotation.y = THREE.Math.mapLinear(
      ball.position.x,
      -app.planeWidth/2, 0,
      Math.PI/6, 0
    )
    paddle.rotation.y = THREE.Math.clamp(paddle.rotation.y, Math.PI/6, 0);
  };

  ball.velocity.reflect( normalizedNormal );
  ball.velocity.z = THREE.Math.mapLinear(
    paddle.rotation.x,
    -Math.PI/12, Math.PI/8,
    1.8, 2.2
  )

  app.aiPaddleSound.play();
};
