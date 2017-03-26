
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



  function makeAffixed(el){
    $(el).affix({offset: {top: 500}});
    $(el).on("affixed.bs.affix", (e)=>{
      $(el).animate({top: 0});
      //console.log(this);
    })
  }

  animations = {};
  animations.affix = makeAffixed;
  ki.animations = animations;

  return ki;

})({});

/*

ref={(el) => {this.controls=el;}}

componentDidMount(){
  $(this.controls).affix();
}

To do:

-make audio control graphic/button
-UI design (http://www.billboard.com/charts/hot-100)
-track revisions of song info
-notify
-image loading/editing interface

ROADMAP:
-error handling


minor bugs
-last line never gets highlighted
-a line can be stuck highlighted during playback, such that 2 far apart lines can be highlighted at a time
-sometimes scrolling gets stuck
-in ogene: "Encountered two children with the same key, `3`. Child keys must be unique;"

enhancements
- should allow italicize, also should clean up text input before inserting, to avoid hacking
-front page should feature lyrics of igbo amaka, w/ option to play
-look at "nku" graphic
-store whether vid or aud in db
-consider adding volume control
-rankings should be reset periodically
*/
