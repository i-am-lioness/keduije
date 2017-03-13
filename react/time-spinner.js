
      class TimeSpinner extends React.Component {
        constructor(props) {
          super(props);
          this.variableName = this.props.variableName;

          this.state = {seconds: window[this.variableName]};


          this.increment = this.increment.bind(this);
          this.decrement = this.decrement.bind(this);

          spinners[this.variableName]=this;

        }

        setValue (val){
          this.setState({seconds: val});
        }

        decrement(){
          if(this.state.seconds>0){
            this.setState((prevState, props) => ({
              seconds: prevState.seconds - 1
            }));
          }
        }

        increment(){

            this.setState((prevState, props) => ({
              seconds: prevState.seconds + 1
            }));

        }

        componentDidUpdate(prevProps, prevState){
          window[this.variableName]=this.state.seconds;
        }
        render () {

          var displayedTimeMark = convertToTime(this.state.seconds);
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