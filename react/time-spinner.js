
      class TimeSpinner extends React.Component {
        constructor(props) {
          super(props);
          this.variableName = this.props.variableName;

          this.increment = this.increment.bind(this);
          this.decrement = this.decrement.bind(this);

        }

        decrement(){
          this.props.decrement(this.variableName);
        }

        increment(){
          this.props.increment(this.variableName);
        }

        convertToTime(seconds){
          var minutes = seconds/60;
          var seconds = seconds%60;
          if (seconds<10) seconds = "0"+seconds;
          return Math.floor(minutes) + ":" + seconds;
        }

        render () {

          var displayedTimeMark = this.convertToTime(this.props.seconds);
          return <div className="spinner-container">
                    <div className="label">{this.props.label}</div>
                    <div className="inner-spinner">
                      <span className="display segmentStart">{displayedTimeMark}</span>
                      <a onClick={this.increment} tabIndex="-1" aria-hidden="true" className="spinner-button">
                        <span className="glyphicon glyphicon-triangle-top" aria-hidden="true"></span>
                      </a>
                      <a onClick={this.decrement} tabIndex="-1" aria-hidden="true" className="spinner-button" style={{top: "50%"}}>
                        <span className="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span>
                      </a>
                      </div>
                  </div>;
        }
      }
