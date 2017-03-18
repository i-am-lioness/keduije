
class Media {
  constructor(ytVID) {
    this.video = ytVID;
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

  isPlaying(){
    return (this.video.getPlayerState()==YT.PlayerState.PLAYING);
  }

  getDuration(){
    return this.video.getDuration();
  }
}

      class MediaPlayer extends React.Component {
        constructor(props) {
          super(props); //type,
          this.state = {
            segmentStart: 0,
            segmentEnd: 0
          };

          this.maxTime = null;
          this.media = null;
          this.saveStartTime=false; //accounts for "jumping" around, rename to "holdStartTime"
          this.timeMarksFrozen = false; //todo: make sure to unfreeze

          this.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady.bind(this);
          this.onPlayerReady = this.onPlayerReady.bind(this);
          this.freezeTimeMarks = this.freezeTimeMarks.bind(this);
          this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
          this.playSegment = this.playSegment.bind(this);
          this.checkForSegmentEnd = this.checkForSegmentEnd.bind(this);
          this.isPlaying = this.isPlaying.bind(this);
          this.getCurrentTime = this.getCurrentTime.bind(this);
          this.incrementTime = this.incrementTime.bind(this);
          this.decrementTime = this.decrementTime.bind(this);
          this.play = this.play.bind(this);
          this.pause = this.pause.bind(this);

        }

        play(){
          this.media.play();
        }

        pause(){
          this.media.pause();
        }

        onYouTubeIframeAPIReady() {
          var iframe = $("iframe.embed-responsive-item")[0]; //revisit
          var video = new YT.Player(iframe, {
            events: {
              'onReady': this.onPlayerReady,
              'onStateChange': this.onPlayerStateChange
            }
          });
          this.media= new Media(video);
        }

        onPlayerReady(event) {
          this.maxTime = this.media.getDuration();
        }

        freezeTimeMarks(val){
          this.timeMarksFrozen = val;
        }


        onPlayerStateChange(event) {
          var segmentStart= this.state.segmentStart;
          var segmentEnd= this.state.segmentEnd;

          if (event.data == YT.PlayerState.PAUSED) {
            if(this.timeMarksFrozen) return; //revisit

            if(!this.saveStartTime){
              this.setState({
                segmentStart: segmentEnd
              });
              segmentStart = segmentEnd;
            }
            this.saveStartTime = false; //turn off switch
            segmentEnd = Math.floor(this.media.getCurrentTime());
            this.setState({
              segmentEnd: segmentEnd
            });

            this.onPaused(segmentStart, segmentEnd);

          }else if (event.data == YT.PlayerState.PLAYING) {

            this.onResume();

          }
        }

        playSegment(){
          this.media.seekTo(this.state.segmentStart,true);
          this.media.play();
          this.saveStartTime = true;
          if(this.state.segmentEnd>-1)
            setTimeout(this.checkForSegmentEnd,1000);
        }

        checkForSegmentEnd(){
          var currentTime = this.media.getCurrentTime();
          if (currentTime > this.state.segmentEnd){
            this.media.pause();
          }else {
            setTimeout(this.checkForSegmentEnd, 1000);
          }
        }

        isPlaying(){
          return (this.media.isPlaying());
        }
        getCurrentTime(){
          var currentTime = this.media.getCurrentTime(); //extract method
          return currentTime;
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
          var percentage=this.state.segmentEnd/this.maxTime;

          return <div>
          <div className='embed-responsive embed-responsive-4by3'>
            <iframe className='embed-responsive-item' src={this.props.src} frameBorder='0' />
          </div>
          <div className="controls">
            <button type="button" className="btn btn-default" aria-label="Left Align" onClick={this.play}>
              <span className="glyphicon glyphicon-play" aria-hidden="true"></span>
            </button>
            <button type="button" className="btn btn-default" aria-label="Left Align" onClick={this.pause}>
              <span className="glyphicon glyphicon-pause" aria-hidden="true"></span>
            </button>
          </div>
          {this.props.canEdit &&
            <LyricEditor
              ref={this.props.registerEditor}
              segmentStart={this.state.segmentStart}
              segmentEnd={this.state.segmentEnd}
              incrementTime={this.incrementTime}
              decrementTime={this.decrementTime}
              percentage={percentage || 0}
              playLyric = {this.playSegment}
              holdTimeMarkers = {this.freezeTimeMarks}
              />}
          </div>;

        }
      }
