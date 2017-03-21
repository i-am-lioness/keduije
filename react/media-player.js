
class Media { //todo: combine both classes
  constructor(iframe, onPlayerReady, handlePaused, handleResume) {
    this.video = new YT.Player(iframe, {
      events: {
        'onReady': onPlayerReady,
        'onStateChange': this._onPlayerStateChange.bind(this)
      }
    });

    this.handlePaused = handlePaused;
    this.handleResume = handleResume;

  }
  _onPlayerStateChange(event) {

    if (event.data == YT.PlayerState.PAUSED) {
      this.handlePaused();
    }else if (event.data == YT.PlayerState.PLAYING) {
      this.handleResume();
    }
  }

  play(){
    this.video.playVideo();
  }
  pause(){
    this.video.pauseVideo();
  }

  getCurrentTime(){
    return this.video.getCurrentTime();
  }

  seekTo(pos, buffer){
    this.video.seekTo(pos, buffer);
  }

  getDuration(){
    return this.video.getDuration();
  }
}

class Audio {
  constructor(audio, playerReadyHandler, pausedHandler, resumeHandler) {
    this.audio = audio;
    this.audio.oncanplay = playerReadyHandler;
    this.audio.onpause = pausedHandler;
    this.audio.onplay = resumeHandler;
    this.audio.load();
  }
  play(){
    this.audio.play();
  }
  pause(){
    this.audio.pause();
  }

  getCurrentTime(){
    return this.audio.currentTime;
  }

  seekTo(pos, buffer){
    this.audio.currentTime = pos;
  }

  getDuration(){
    return this.audio.duration;
  }
}

      class MediaPlayer extends React.Component {
        constructor(props) {
          super(props); //type,
          this.state = {
            segmentStart: 0,
            segmentEnd: 0,
            currentTime: 0,
            displayEditor: false,
            originalText: "",
            text: "",
            editMode: false,
            editType: "add",
            lyrics: []
          };

          this.maxTime = null;
          this.media = null;
          this.saveStartTime=false; //accounts for "jumping" around, rename to "holdStartTime"
          this.timeMarksFrozen = false; //todo: make sure to unfreeze
          this.timer;
          this.indexBeingModified = null;
          this.stopAtSegmentEnd = false;

          this.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady.bind(this);
          this.onPlayerReady = this.onPlayerReady.bind(this);
          this.playSegment = this.playSegment.bind(this);
          this.incrementTime = this.incrementTime.bind(this);
          this.decrementTime = this.decrementTime.bind(this);
          this.play = this.play.bind(this);
          this.pause = this.pause.bind(this);
          this.handlePaused = this.handlePaused.bind(this);
          this.seekTo = this.seekTo.bind(this);
          this.onTimeout = this.onTimeout.bind(this);
          this.handleResume = this.handleResume.bind(this);
          this.showEditDialog = this.showEditDialog.bind(this);
          this.saveLyric = this.saveLyric.bind(this);
          this.loadLyrics = this.loadLyrics.bind(this);
          this.jumpTo = this.jumpTo.bind(this);
          this.close = this.close.bind(this);
          this.handleToggleEditMode = this.handleToggleEditMode.bind(this);
          this.handleTextChange = this.handleTextChange.bind(this);
          this.showEditHeaderDialog = this.showEditHeaderDialog.bind(this);

        }

        showEditHeaderDialog(data){
          this.indexBeingModified = data;
          var headingText = prompt(data.heading ? "Update Heading" : "Please enter heading", data.heading || "[]");
          this.saveLyric(headingText)
        }

        handleTextChange(event) {
          this.setState({text: event.target.value});
        }

        saveLyric(headingText){
          if(this.indexBeingModified){

              var oldLyricObj = this.indexBeingModified;
              var newLyricObj = $.extend({}, oldLyricObj);
              if(headingText){
                newLyricObj.heading = headingText;
              } else {
                newLyricObj.text = this.state.text;
                newLyricObj.startTime = this.state.segmentStart;
                newLyricObj.endTime = this.state.segmentEnd;
              }

            KeduIje.updateLyric(oldLyricObj, newLyricObj, this.loadLyrics);

          }else {
            var newLyric = {
              text: this.state.text,
              endTime: this.state.segmentEnd,
              deleted: false,
              id: this.state.lyrics.length,
              startTime: this.state.segmentStart,
              heading: null
            };
            KeduIje.addLyric(newLyric, this.loadLyrics);
          }
          this.indexBeingModified = false;

        }

        handleToggleEditMode(){

          this.setState((prevState, props) => ({
            editMode: !prevState.editMode
          }));
        }

        showEditDialog(data){
          this.indexBeingModified = data;

          var mode = "add";
          var originalText = null;
          if(data.text){
            this.timeMarksFrozen = true;
            mode = "save";
            originalText = 'original: "' + data.text + '"';
          }

          this.setState({
            displayEditor: true,
            originalText: originalText,
            editType: mode,
            text: data.text,
            segmentStart: parseInt(data.startTime),
            segmentEnd: parseInt(data.endTime)
          });
        }

        close(){
          this.setState({
            displayEditor: false,
            originalText: null,
            editType: "add",
            text: null
          });

          this.timeMarksFrozen = false;
        }

        loadLyrics(lyrics){

          lyrics.sort(function(a, b){
            return parseInt(a.startTime)-parseInt(b.startTime);
          });

          this.setState({
            lyrics: lyrics,
            displayEditor: false,
            text: ""
          });
        }

        play(){
          this.media.play();
        }

        pause(){
          this.media.pause();
        }

        seekTo(percentage){
          var time = percentage * this.maxTime;
          this.setState({currentTime: time});
          this.media.seekTo(time);
        }

        onTimeout(){
          var currentTime = this.media.getCurrentTime();
          this.setState({currentTime: currentTime});

          //stop if playing a segment
          if(this.stopAtSegmentEnd && (currentTime > this.state.segmentEnd)){
            this.media.pause();
            this.stopAtSegmentEnd = false;
          }

        }

        onYouTubeIframeAPIReady() {
          if(this.props.mediaType!=KeduIje.mediaTypes.VIDEO) return; //todo: add sanity check here

          this.media= new Media(this.iframe, this.onPlayerReady, this.handlePaused, this.handleResume);
        }

        loadAudio(audio){
          this.audioElement = audio;
        }

        componentDidMount(){
            KeduIje.loadLyrics(this.loadLyrics)

            if(this.props.mediaType!=KeduIje.mediaTypes.AUDIO) return; //todo: add sanity check here
            this.media = new Audio(this.audioElement, this.onPlayerReady, this.handlePaused, this.handleResume);
        }

        onPlayerReady(event) {
          this.maxTime = this.media.getDuration();
        }

        handlePaused(){
          clearInterval(this.timer);
          if(this.timeMarksFrozen) return; //revisit

          var segmentStart= this.state.segmentStart;
          var segmentEnd= this.state.segmentEnd;

          if(!this.saveStartTime){
            this.setState({
              segmentStart: segmentEnd
            });
            segmentStart = segmentEnd;
          }
          this.saveStartTime = false; //turn off switch
          segmentEnd = Math.floor(this.media.getCurrentTime());
          this.setState({
            segmentEnd: segmentEnd,
            displayEditor: true
          });

        }

        handleResume(){
          this.timer = setInterval(this.onTimeout,1000);
        }

        jumpTo(start, end){

          this.setState({
            segmentStart: start,
            segmentEnd: end
          }, this.playSegment);

        }

        playSegment(stopAtSegmentEnd){
          this.media.seekTo(this.state.segmentStart,true);
          this.media.play();
          this.saveStartTime = true;
          this.stopAtSegmentEnd = stopAtSegmentEnd;
        }

        decrementTime(variableName){
          if(this.state[variableName]>0){
            this.setState((prevState, props) => {
              var newState = {};
              newState[variableName] = prevState[variableName] - 1;
              return newState;
            });
          }
        }

        incrementTime(variableName){
          if(this.state[variableName]<this.maxTime){
            this.setState((prevState, props) => {
              var newState = {};
              newState[variableName] = prevState[variableName] + 1;
              return newState;
            });
          }
        }

        render () {
          var percentage=this.state.currentTime/this.maxTime;
          var mediaElement;

          if(this.props.mediaType==KeduIje.mediaTypes.AUDIO){
            mediaElement = <audio ref={this.loadAudio.bind(this)}>
              <source src={this.props.src} type="audio/mpeg" />;
            </audio>
          }else {
            mediaElement = <iframe ref={(iframe) => {this.iframe = iframe;}} className='embed-responsive-item' src={this.props.src} frameBorder='0' />;
          }

          var videoColumn =  <div id="video-column" className="col-md-6 col-xs-12">
          <div className='embed-responsive embed-responsive-4by3'>
            {mediaElement}
          </div>
          <MediaControls
            onPlay={this.play}
            onPause={this.pause}
            onSeekTo={this.seekTo}
            percentage={percentage}
            />

          {this.props.canEdit &&
            <LyricEditor
              ref={this.props.registerEditor}
              segmentStart={this.state.segmentStart}
              segmentEnd={this.state.segmentEnd}
              incrementTime={this.incrementTime}
              decrementTime={this.decrementTime}
              percentage={percentage || 0}
              playLyric = {this.playSegment.bind(this, true)}
              displayed = {this.state.displayEditor}
              originalText = {this.state.originalText}
              editMode = {this.state.editMode}
              mode = {this.state.editType}
              close = {this.close}
              handleToggleEditMode = {this.handleToggleEditMode}
              saveLyric = {this.saveLyric}
              value = {this.state.text}
              handleChange = {this.handleTextChange}
              />}
          </div>;

          return <div className="row">
            {videoColumn}
            <div id="lyric-column" className="col-md-6 col-xs-12 col-md-offset-6" style={{backgroundImage: 'url('+ this.props.artworkSrc +')'}}>
              <LyricDisplay
                lyrics={this.state.lyrics}
                currentTime={this.state.currentTime}
                editMode={this.state.editMode}
                jumpTo={this.jumpTo}
                showEditDialog={this.showEditDialog}
                showEditHeaderDialog={this.showEditHeaderDialog}
                />
            </div>
          </div>;

        }
      }
