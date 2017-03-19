
      class LyricDisplay extends React.Component {
        constructor(props) {
          super(props); //currentTime, editMode, lyrics

          this.eachLyric = this.eachLyric.bind(this);
          this.scrollIfOutOfView = this.scrollIfOutOfView.bind(this);
          this.jumpTo = this.jumpTo.bind(this);
        }

        //responsively adjusts scroll position of lyrics during playback
        scrollIfOutOfView(element){
          var position = $(element).offset().top;
          var windowTop = $(window).scrollTop();
          var height = $(window).height();
          var windowBottom = windowTop + height * 0.7;

          if ((position<windowTop) || (position > windowBottom))
            $("html,body").animate({scrollTop: position-height*0.2}, 800);
        }

        componentDidUpdate(){
          var currentLine= $(".current")[0];
          if(currentLine){ //todo: consider using ref
            this.scrollIfOutOfView(currentLine);
          }
        }

        jumpTo(e){

          var currentLine = e.currentTarget;
          var currentLineStartTime = parseInt($(currentLine).data("start-time"));
          var currentLineEndTime = parseInt($(currentLine).data("end-time"));
          $(currentLine).addClass("current"); //may not be necessary if the sampling rate increases
          this.props.jumpTo(currentLineStartTime, currentLineEndTime);

        }


        eachLyric(ly, idx, arr){

          var pencil = <span
            className="glyphicon glyphicon-pencil"
            aria-hidden="true"
            data-start-time={ly.startTime}
            data-end-time={ly.endTime}
            data-index={idx}
            data-text={ly.text}
            data-is-header={!!ly.heading}
            ></span>;


          if(ly.heading){
            return <h4 key={ly.key}>{pencil}{ly.heading}</h4>;
          }

          var pClass = ly.startTime; //todo: revisit, may no longer be necessary
          var a = null;
          if(ly.hasHeading){
            pClass +=(" has-heading");

          }else{
            a = <a className = "add-heading-btn" href="#" data-index={idx}>
                  <span className = "glyphicon glyphicon-plus" aria-hidden="true"></span>
                  Add Heading
                </a>
          }

          if(!this.props.editMode && (ly.startTime<=this.props.currentTime)&&(this.props.currentTime<=ly.endTime)){
            pClass +=(" current");
          }

          return <p
                    className={pClass}
                    key={ly.key}
                    data-start-time={ly.startTime}
                    data-end-time={ly.endTime}
                    data-index={idx}
                    onClick={this.jumpTo}
                    >
                    {pencil}
                    <span>{ly.text}</span>
                    {a}
                    </p>;

        }

        render () {

          var rows=[];
          var curr=null;
          var forDisplay=null;
          //console.log(this.props.lyrics);
          for(var i = 0 ; i < this.props.lyrics.length; i++){
            curr=this.props.lyrics[i];
            forDisplay = $.extend({}, curr);
            if(curr.heading){
              rows.push($.extend({key: curr.id+"-h"}, curr));
              forDisplay.heading=null;
              forDisplay.hasHeading= true;
            }
            forDisplay.key=curr.id;
            rows.push(forDisplay);
          }

          var rowDisplay = rows.map(this.eachLyric);

          //console.log(rowDisplay);

          return <div id="lyricsDisplay">
          {rowDisplay}
          </div>;

        }
      }
