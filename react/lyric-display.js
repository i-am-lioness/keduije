
  class PencilIcon extends React.Component {

    render(){
      var hoveredClass = (this.props.hoveredIdx == this.props.idx)? " hover" : "";
    return <span
      className={"glyphicon glyphicon-pencil "+ hoveredClass}
      aria-hidden="true"
      onClick={this.props.onClick}
      ></span>;
    }
  }

      class LyricDisplay extends React.Component {
        constructor(props) {
          super(props); //currentTime, editMode, lyrics

          this.state = {
            hoveredIdx: -1,
            hoveredLinkIdx: -1
          };

          this.eachLyric = this.eachLyric.bind(this);
          this.jumpTo = this.jumpTo.bind(this);
          this.hoverStart = this.hoverStart.bind(this);
          this.hoverEnd = this.hoverEnd.bind(this);
          this.editLyric = this.editLyric.bind(this);
        }

        componentDidUpdate(prevProps, prevState){
          if(prevProps.currentTime==this.props.currentTime) return;
          if(this.currentLine){
            KeduIje.scrollIfOutOfView(this.currentLine);
          }
        }

        jumpTo(data, e){
          e.preventDefault();
          this.setState({hoveredIdx: -1}); //in case touch screen triggered hover setting
          var currentLine = e.currentTarget;
          var currentLineStartTime = parseInt(data.startTime);
          var currentLineEndTime = parseInt(data.endTime);
          $(".current").removeClass("current"); //may not be necessary if the sampling rate increases
          $(currentLine).addClass("current"); //may not be necessary if the sampling rate increases
          this.props.jumpTo(currentLineStartTime, currentLineEndTime);

        }

        hoverStart(idx, e){
          this.setState({hoveredIdx: idx});
        }

        hoverEnd(){
          this.setState({hoveredIdx: -1});
        }

        showBtn(idx){
          this.setState({hoveredLinkIdx: idx});
        }
        hideBtn(){
          this.setState({hoveredLinkIdx: -1});
        }

        editLyric (data, index, forHeader, e){
          e.stopPropagation();
          if ( (this.state.hoveredIdx == index) && this.props.editMode ){
            if(forHeader)
              this.props.showEditHeaderDialog(data);
            else
              this.props.showEditDialog(data);
          }

        }

        eachLyric(ly, idx){

          if(ly.heading){
            return <h4 key={ly.key} onMouseEnter={this.hoverStart.bind(this, idx)}>
              {this.props.editMode && <PencilIcon onClick={this.editLyric.bind(this, ly.data, idx, true)} idx={idx} hoveredIdx={this.state.hoveredIdx}/>}
              {ly.heading}
            </h4>;
          }

          var pClass = "lyric-line";
          var a = null;
          if(!ly.hasHeading){
            a = <a
                  className = "add-heading-btn"
                  href="#"
                  onMouseEnter={this.showBtn.bind(this, idx)}
                  onMouseLeave={this.hideBtn.bind(this)}
                  onClick={this.editLyric.bind(this, ly.data, idx, true)}
                  style={{opacity: (this.props.editMode&&(this.state.hoveredLinkIdx == idx))? 1 : 0}}
                >
                  <span className = "glyphicon glyphicon-plus" aria-hidden="true"></span>
                  Add Heading
                </a>
          }

          var isTheCurrentLine = false;
          if(!this.props.editMode && (ly.startTime<=this.props.currentTime)&&(this.props.currentTime<=ly.displayEndTime)){
            pClass +=(" current");
            isTheCurrentLine = true;
          }

          if(this.state.hoveredIdx == idx){
            pClass +=(" hovered");
          }

          return <div
                    className={pClass}
                    key={ly.key}
                    onClick={this.jumpTo.bind(this,ly.data)}
                    onMouseEnter={this.hoverStart.bind(this, idx)}
                    ref={(el)=>{if (isTheCurrentLine) this.currentLine = el;}}
                    >
                      {this.props.editMode && a}
                      <p>
                        {this.props.editMode && <PencilIcon onClick={this.editLyric.bind(this, ly.data, idx, false)} idx={idx} hoveredIdx={this.state.hoveredIdx}/>}
                        {ly.text}
                      </p>
                    </div>;

        }

        render () {

          var rows=[];
          var curr=null;
          var forDisplay=null;
          var rowDisplay = null;
          var subTitle = null

          if (this.props.videoIsPlaying){
            for(var i = 0 ; i < this.props.lyrics.length; i++){
              curr=this.props.lyrics[i];
              var displayStartTime = curr.startTime - 1;
              var displayEndTime = (this.props.lyrics[i+1])? this.props.lyrics[i+1].startTime -1 : curr.endTime;
              if((displayStartTime<=this.props.currentTime)&&(this.props.currentTime<=displayEndTime)){
                subTitle = <p className="subtitles" key={curr.id}>{curr.text}</p>;
                break;
              }
            }

            rowDisplay= <ReactCSSTransitionGroup
              transitionName="example"
              transitionEnterTimeout={500}
              transitionLeaveTimeout={300}
            >
              {subTitle}
            </ReactCSSTransitionGroup>;

          }else {

            for(var i = 0 ; i < this.props.lyrics.length; i++){
              curr=this.props.lyrics[i];
              delete curr.key;
              forDisplay = $.extend({data: curr}, curr);
              if(curr.heading){
                rows.push($.extend({key: curr._id+"-h", data: curr}, curr));
                forDisplay.heading=null;
                forDisplay.hasHeading= true;
              }
              forDisplay.key=curr._id;
              forDisplay.displayEndTime = (this.props.lyrics[i+1])? this.props.lyrics[i+1].startTime : forDisplay.endTime;

              rows.push(forDisplay);
            }

            this.currentLine = null;
            rowDisplay = rows.map(this.eachLyric);
          }

          return <div id="lyricsDisplay" onMouseLeave={this.hoverEnd}>
              {rowDisplay}
          </div>;

        }
      }
