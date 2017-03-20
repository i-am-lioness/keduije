
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

  return ki;

})({});

/*

To do:

URGENT: fix edit lyric bug
--look at http://localhost:3000/music/id/kbVhw7muUnY
--copy of ids 6 & 7

-fully integrate audio
--make smoother highlting flow
--new music form
--re-design data schema
---remove "isHeading" field from lyrics



ROADMAP:
-UI design
--design controls

-error handling
-log visitors

*/
