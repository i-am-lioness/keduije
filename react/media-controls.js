
class ProgressBar extends React.Component {
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

  render (){
    return <div className="seeking" onMouseMove={this.followMouse} onMouseLeave={this.clearGuide}>
      <div className="seeking-bar" ref={(element) => {this.seekerBar = element}} onClick={this.seekTo} >
        <div className="seeking-bar-guide"></div>
        <div className="seeking-bar-meter" ref={(element) => {this.seeker = element}} style={{width: 100 * this.props.percentage + "%"}}></div>
      </div>
    </div>;
  }


}


class PlayControl extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hover: false
    };

  }

  handleClick(e){
    $(e.currentTarget).blur();
    this.setState({hover: false}); //for touch screens
    this.props.togglePlayState();
  }

  render(){

    var hover = this.state.hover? "hover" : "";
    var icon = this.props.isPlaying? "pause" : "play";

    return  <button type="button"
      className={hover}
      aria-label="Left Align"
      onClick={this.handleClick.bind(this)}
      onMouseEnter = {this.setState.bind(this, {hover: true}, null)}
      onMouseLeave = {this.setState.bind(this, {hover: false}, null)}
      >
        <span className={"glyphicon glyphicon-" + icon} aria-hidden="true"></span>
      </button>;
  }

}
