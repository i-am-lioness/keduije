
var KeduIje = (function(ki){

var songID = null;

function loadLyrics(cb){
  $.get("/lyrics/"+songID, cb);
}

function addLyric(newLyric, cb){

  $.post("/lyrics/"+songID+"/addline", newLyric, cb);
}

function updateLyric(oldLyricObj, newLyricObj, cb){

    var postData = {
      new: newLyricObj,
      original: oldLyricObj
    };

  //todo: postdata should be validated
  $.post("/lyrics/"+songID+"/editline/"+oldLyricObj.id, postData, cb);

}

  ki.init = function (_songID){
    songID = _songID;
  };

  ki.loadLyrics = loadLyrics;
  ki.updateLyric = updateLyric;
  ki.addLyric = addLyric;

  return ki;

})({});

/*

To do:

URGENT: fix edit lyric bug
--look at http://localhost:3000/music/id/kbVhw7muUnY
--copy of ids 6 & 7

--explore integrating LyricDisplay component into MediaPlayer
-fully integrate audio
--new music form
--re-design data schema
--implement controls
--move timer controlls to hook

Backend
--remove "isHeading" field form lyrics

-UI design
--design control

-move pug rednering of lyric display to client side
--remove obsolete template

-bug: after login, goes to http://localhost:3000/music/id/h01_dEXLqsk#_=_ (achikolo)

-error handling
--make sure that youtube api loaded on time

-log visitors

*/
