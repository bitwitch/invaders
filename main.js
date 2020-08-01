document.addEventListener("DOMContentLoaded", function() {

  var canvas = document.getElementById('stage');
  canvas.height = window.innerHeight - 50;
  canvas.width = canvas.height * 3 / 4;

  var startButton = document.getElementById('start');
  var invaders = createInvaders();

  startButton.addEventListener("click", function() {
    invaders.run();
  });

});




