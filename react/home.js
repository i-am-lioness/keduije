/* global $  */

$.get('/api/rankings', (html) => {
  $('#rankings').html(html);
});

$.get('/api/list/audio', (html) => {
  $('#horizontal-slider').html(html);

  const len = $('a.thumbnail').length;
  const last = $('a.thumbnail')[len - 1];
  const end = $(last).position().left + $(last).width();
  $('#horizontal-slider').css('width', end + 10);
});


$.get('/api/carousel', (html) => {
  if (!html) return;

  $('#main-carousel').html(html);

  // make sure one is active
  $('.carousel-indicators li').first().addClass('active');
  $('.carousel-inner .item').first().addClass('active');

  // $('.carousel').carousel();
});

