//var videos = ["cWx8tUtfdeE", "kTWYQnbqN8I", "h01_dEXLqsk", "Uyr1c0pkpas", "9F53UQ_2L_I", "jkO8tHcda5E"];

$.get("/songs/all", function(videos){
  $.each(videos, function (index, songID){
    var thumbnail = $('<div class="col-xs-6 col-md-3"><a href="/music/id/' +
      songID + '" class="thumbnail"><img src="https://img.youtube.com/vi/'+
      songID + '/1.jpg" alt="..."></a></div>');
    $("#buttons").append(thumbnail);
  });
})
