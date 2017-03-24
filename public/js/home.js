

$.get("/api/rankings", function(html){

  $("#rankings").html(html);

})

$.get("/api/list/audio", function(html){

  $("#horizontal-slider").html(html);

  var len = $("a.thumbnail").length;
  var last = $("a.thumbnail")[len-1];
  var end = $(last).position().left + $(last).width();
  $("#horizontal-slider").css("width", end+10);


})


$.get("/api/carousel", function(html){

  $("#main-carousel").html(html);

  //make sure one is active
  $(".carousel-indicators li").first().addClass("active");
  $(".carousel-inner .item").first().addClass("active");

  $('.carousel').carousel();
})
