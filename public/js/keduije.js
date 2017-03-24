
var KeduIje = (function(ki){

  var songID = null;

  function loadLyrics(cb){
    $.get("/api/lyrics/"+songID, cb);
  }

  function addLyric(newLyric, cb){
    $.post("/api/lyrics/"+songID+"/addline", newLyric, cb);
  }

  function updateLyric(oldLyricObj, newLyricObj, cb){

    var postData = {
      new: newLyricObj,
      original: oldLyricObj
    };

    //todo: postdata should be validated
    $.post("/api/lyrics/"+songID+"/editline/"+oldLyricObj.id, postData, cb);

  }

  function saveSongInfo(songInfo, cb){
    songInfo.songID = songID;
    $.post("/api/song/edit", songInfo, cb);
  }

  ki.mediaTypes = {
    AUDIO: 0,
    VIDEO: 1
  };

  ki.init = function (_songID){
    songID = _songID;
  };

  ki.loadLyrics = loadLyrics;
  ki.updateLyric = updateLyric;
  ki.addLyric = addLyric;
  ki.saveSongInfo = saveSongInfo;

  return ki;

})({});

/*

To do:

add artist info
make prod vs dev

ROADMAP:
-UI design

-error handling
-log visitors

minor bugs
-last line never gets highlighted
-a line can be stuck highlighted during playback, such that 2 far apart lines can be highlighted at a time
-sometimes scrolling gets stuck

enhancements
-front page should feature lyrics of igbo amaka, w/ option to play
-look at "nku" graphic
-store whether vid or aud in db
-consider adding volume control
*/
