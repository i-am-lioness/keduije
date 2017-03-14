
$.get("/carousel", function(html){

  $("#main-carousel").html(html);

  //make sure one is active
  $(".carousel-indicators li").first().addClass("active");
  $(".carousel-inner .item").first().addClass("active");

  $('.carousel').carousel();
})
