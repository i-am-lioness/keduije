
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

  //responsively adjusts scroll position of lyrics during playback
  function scrollIfOutOfView(element){
    var position = $(element).offset().top;
    var windowTop = $(window).scrollTop();
    var height = $(window).height();
    var windowBottom = windowTop + height * 0.7;

    if ((position<windowTop) || (position > windowBottom))
      $("html,body").animate({scrollTop: position-height*0.2}, 800);
  }

  ki.init = function (_songID){
    songID = _songID;
  };

  ki.loadLyrics = loadLyrics;
  ki.updateLyric = updateLyric;
  ki.addLyric = addLyric;
  ki.saveSongInfo = saveSongInfo;
  ki.scrollIfOutOfView = scrollIfOutOfView;


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
