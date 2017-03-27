
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



  function makeAffixed(el, affixFrom){
    $(el).affix({offset: {top: affixFrom}});

    $(el).on("affixed.bs.affix", (e)=>{
      $(el).animate({top: 0});
    });
    $(el).on("affix-top.bs.affix", (e)=>{
      $(el).addClass("transition");
    });
    $(el).on("affixed-top.bs.affix", (e)=>{
      $(el).animate({top: "-80px"}, ()=>{
        $(el).css("top", "");
        $(el).removeClass("transition");
      });
    });

  }

  animations = {};
  animations.affix = makeAffixed;
  ki.animations = animations;

  return ki;

})({});
