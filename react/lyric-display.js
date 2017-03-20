
  class PencilIcon extends React.Component {

    render(){
    return <span
      className="glyphicon glyphicon-pencil"
      aria-hidden="true"
      style={{opacity: (this.props.editMode&&(this.props.hoveredIdx == this.props.idx))? 1 : 0}}
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
          this.scrollIfOutOfView = this.scrollIfOutOfView.bind(this);
          this.jumpTo = this.jumpTo.bind(this);
          this.showIcon = this.showIcon.bind(this);
          this.editLyric = this.editLyric.bind(this);
          this.handleAddHeading = this.handleAddHeading.bind(this);
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

        jumpTo(data, e){

          var currentLine = e.currentTarget;
          var currentLineStartTime = parseInt(data.startTime);
          var currentLineEndTime = parseInt(data.endTime);
          $(".current").removeClass("current"); //may not be necessary if the sampling rate increases
          $(currentLine).addClass("current"); //may not be necessary if the sampling rate increases
          this.props.jumpTo(currentLineStartTime, currentLineEndTime);

        }

        showIcon(idx){
          this.setState({hoveredIdx: idx});
        }
        showBtn(idx){
          this.setState({hoveredLinkIdx: idx});
        }
        hideBtn(){
          this.setState({hoveredLinkIdx: -1});
        }

        editLyric (data, index, e){
          e.stopPropagation();
          if ( (this.state.hoveredIdx == index) && this.props.editMode ){
            if(data.forHeader)
              this.props.showEditHeaderDialog(data);
            else
              this.props.showEditDialog(data);
          }

        }

        handleAddHeading(idx, data){//todo: merge with above
          if ( (this.state.hoveredLinkIdx==idx) && this.props.editMode ){
            this.props.showEditHeaderDialog(data);
          }

        }

        eachLyric(ly, idx){

          var headerData = $.extend({forHeader: true}, ly.data);


          if(ly.heading){
            return <h4 key={ly.key} onMouseEnter={this.showIcon.bind(this, idx)}>
              <PencilIcon onClick={this.editLyric.bind(this, headerData, idx)} idx={idx} editMode={this.props.editMode} hoveredIdx={this.state.hoveredIdx}/>
              {ly.heading}
            </h4>;
          }

          var pClass = ly.startTime; //todo: revisit, may no longer be necessary
          var a = null;
          if(ly.hasHeading){
            pClass +=(" has-heading");

          }else{
            a = <a
                  className = "add-heading-btn"
                  href="#"
                  onMouseEnter={this.showBtn.bind(this, idx)}
                  onMouseLeave={this.hideBtn.bind(this)}
                  onClick={this.handleAddHeading.bind(this, idx, ly.data)}
                  style={{opacity: (this.props.editMode&&(this.state.hoveredLinkIdx == idx))? 1 : 0}}
                >
                  <span className = "glyphicon glyphicon-plus" aria-hidden="true"></span>
                  Add Heading
                </a>
          }

          if(!this.props.editMode && (ly.startTime<=this.props.currentTime)&&(this.props.currentTime<=ly.displayEndTime)){
            pClass +=(" current");
          }

          return <p
                    className={pClass}
                    key={ly.key}
                    onClick={this.jumpTo.bind(this,ly.data)}
                    onMouseEnter={this.showIcon.bind(this, idx)}
                    >
                      <PencilIcon onClick={this.editLyric.bind(this, ly.data, idx)} idx={idx}  editMode={this.props.editMode} hoveredIdx={this.state.hoveredIdx}/>

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
            delete curr.key;
            forDisplay = $.extend({data: curr}, curr);
            if(curr.heading){
              rows.push($.extend({key: curr.id+"-h", data: curr}, curr));
              forDisplay.heading=null;
              forDisplay.hasHeading= true;
            }
            forDisplay.key=curr.id;
            if(this.props.lyrics[i+1]) forDisplay.displayEndTime = this.props.lyrics[i+1].startTime;

            rows.push(forDisplay);
          }

          var rowDisplay = rows.map(this.eachLyric);

          //console.log(rows);

          return <div id="lyricsDisplay">
          {rowDisplay}
          </div>;

        }
      }
