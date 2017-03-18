
      class MediaPlayer extends React.Component {
        constructor(props) {
          super(props); //type,
          this.state = {
            segmentStart: 0,
            segmentEnd: 0
          };

          this.maxTime = null;
          this.player = null;
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

        }

        onYouTubeIframeAPIReady() {
          var iframe = $("iframe.embed-responsive-item")[0]; //revisit
          this.player = new YT.Player(iframe, {
            events: {
              'onReady': this.onPlayerReady,
              'onStateChange': this.onPlayerStateChange
            }
          });
        }

        onPlayerReady(event) {
          this.maxTime = this.player.getDuration();
        }

        freezeTimeMarks(){
          this.timeMarksFrozen = true;
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
            segmentEnd = Math.floor(this.player.getCurrentTime());
            this.setState({
              segmentEnd: segmentEnd
            });

            this.onPaused(segmentStart, segmentEnd);

          }else if (event.data == YT.PlayerState.PLAYING) {

            this.onResume();

          }
        }

        playSegment(){
          this.player.seekTo(this.state.segmentStart,true);
          this.player.playVideo();
          this.saveStartTime = true;
          if(this.state.segmentEnd>-1)
            setTimeout(this.checkForSegmentEnd,1000);
        }

        checkForSegmentEnd(){
          var currentTime = this.player.getCurrentTime();
          if (currentTime > this.state.segmentEnd){
            this.player.pauseVideo();
          }else {
            setTimeout(this.checkForSegmentEnd, 1000);
          }
        }

        isPlaying(){
          return (this.player.getPlayerState()==YT.PlayerState.PLAYING);
        }
        getCurrentTime(){
          var currentTime = this.player.getCurrentTime(); //extract method
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
          {this.props.canEdit &&
            <LyricEditor
              ref={this.props.registerEditor}
              segmentStart={this.state.segmentStart}
              segmentEnd={this.state.segmentEnd}
              incrementTime={this.incrementTime}
              decrementTime={this.decrementTime}
              percentage={percentage || 0}
              />}
          </div>;

        }
      }
