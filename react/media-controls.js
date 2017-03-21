class MediaControls extends React.Component {
  constructor(props) {
    super(props);
    this.followMouse = this.followMouse.bind(this);
    this.clearGuide = this.clearGuide.bind(this);
    this.seekTo = this.seekTo.bind(this);
  }

  followMouse(e){

      var seekerOffset = $(this.seekerBar).offset().left;
      var relativePosition = e.pageX - seekerOffset;

      $(".seeking-bar-guide").css("width", relativePosition);

  }

  clearGuide(){
    $(".seeking-bar-guide").css("width", 0);
  }

  seekTo(e){
    var seekerOffset = $(this.seekerBar).offset().left;
    var relativePosition = e.pageX - seekerOffset;
    var percentage = relativePosition/($(this.seekerBar).width());

    this.props.onSeekTo(percentage);

  }

  render(){

    return           <div className="controls">
                <button type="button" className="btn btn-default" aria-label="Left Align" onClick={this.props.onPlay}>
                  <span className="glyphicon glyphicon-play" aria-hidden="true"></span>
                </button>
                <button type="button" className="btn btn-default" aria-label="Left Align" onClick={this.props.onPause}>
                  <span className="glyphicon glyphicon-pause" aria-hidden="true"></span>
                </button>
                <div className="seeking btn btn-default" onMouseMove={this.followMouse} onMouseLeave={this.clearGuide}>
                  <div className="seeking-bar" ref={(element) => {this.seekerBar = element}} onClick={this.seekTo} >
                    <div className="seeking-bar-guide"></div>
                    <div className="seeking-bar-meter" ref={(element) => {this.seeker = element}} style={{width: 100 * this.props.percentage + "%"}}></div>
                  </div>
                </div>
              </div>;
  }

}
