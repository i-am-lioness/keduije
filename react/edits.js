
var update = React.addons.update;

class Edits extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      listings: {}, //media by changeset
      changesets: [],
      songs:{}, //media by _id
      edits: {},
      adds: {},
      showMoreBtn: true
    };

    this.eachEdit = this.eachEdit.bind(this);
    this.eachDiff = this.eachDiff.bind(this);
    this.setEdits = this.setEdits.bind(this);
    this.setAdds = this.setAdds.bind(this);
    this.saveSongInfo = this.saveSongInfo.bind(this);
    this.processEdit = this.processEdit.bind(this);
    this.setChangesets = this.setChangesets.bind(this);
    this.eachChangeset = this.eachChangeset.bind(this);
    this.processSession = this.processSession.bind(this);
    this.listEdits = this.listEdits.bind(this);
    this.loadMoreChangesets = this.loadMoreChangesets.bind(this);

    this.lastChangesetID = null;

    this.query = {};
    if("byUser" in this.props)
      this.query.user = this.props.byUser;
    else if("media" in this.props)
      this.query.media = this.props.media;
  }

  componentWillMount(){
    KeduIje.getChangesets(this.setChangesets, this.query);
  }

  loadMoreChangesets(){
    this.query.from = this.lastChangesetID;
    KeduIje.getChangesets(this.setChangesets, this.query);
  }

  setChangesets(changesets){
    changesets.forEach(this.processSession);
    changesets.sort((a,b)=>{return (b.date-a.date);});

    if(changesets.length<10){
      this.setState({showMoreBtn: false});
    }

    this.setState({changesets: update(this.state.changesets, {$push: changesets})});
  }

  setEdits(changesetID, edits){
    edits.forEach(this.processEdit.bind(this,"edit"));
    edits.sort((a,b)=>{return (b.date-a.date);});

    var updateObj = {};
    updateObj[changesetID]={$set: edits};
    this.setState({edits: update(this.state.edits, updateObj)});
  }

  saveSongInfo(songInfo){
    var updateObj = {};
    updateObj[songInfo._id]={$set: songInfo};
    this.setState({songs: update(this.state.songs, updateObj)});
  }

  setAdds(changesetID, adds){
    adds.forEach(this.processEdit.bind(this,"add"));
    adds.sort((a,b)=>{return (b.date-a.date);});

    var updateObj = {};
    updateObj[changesetID]={$set: adds};
    this.setState({adds: update(this.state.adds, updateObj)});
  }

  setListing(changesetID, media){ //todo, make more efficient
    var updateObj = {};
    updateObj[changesetID]={$set: media};
    this.setState({listings: update(this.state.listings, updateObj)});
  }

  processEdit(type, el){
    el.type=type;

    if(type=="edit"){
      if("deleted" in el.newValues){ 
        if((el.newValues.deleted==true)||(el.newValues.deleted=="true"))
          el.type="deletion";
        else{ //todo: for now treat lyric recoveries like brand new adds
          el.type="add";
          el.text=edit.newValues.text; //todo: should Object.assign()
        }
      }else if(el.target=="media"){ //todo: reorganize
        el.type="info";
        if(el.newValues.status=="deleted"){
          el.type="removal"; //song deletion, todo: organize semantics
        }
      }
    }

    el.time = parseInt(el.original? (el.original.startTime || -1) : el.startTime);

  }

  processSession(el){

    var timestamp = el._id.toString().substring(0,8);
    var date = new Date( parseInt( timestamp, 16 ) * 1000 );
    el.date=date;

    var changesetID = el._id;
    this.lastChangesetID = changesetID;

    if(el.type=="new"){
      KeduIje.getMediaByChangeset(changesetID, this.setListing.bind(this, changesetID));
    }else{

      var mediaID = el.mediaID;

      if(!this.state.songs[mediaID])
        KeduIje.getMediaInfo(mediaID, this.saveSongInfo);

      KeduIje.getRevisions(changesetID, this.setEdits.bind(this, changesetID));
      KeduIje.myLines(changesetID, this.setAdds.bind(this, changesetID));
    }
  }

  eachDiff(diff,i){

    var className = null;
    if(diff.added)
      className="added";
    else if(diff.removed)
      className="removed"

    return <span className={className} key={i}>{diff.value}</span>;
  }

  changedInfo(name, edit){
    return <p>Renamed {name}: {edit.original[name]} => {edit.newValues[name]}</p>;
  }

  changedTimeMark(label, edit, field, timeUrl){
    if(edit.newValues[field]){
      var formatedTimeOld = KeduIje.convertToTime(edit.original[field]);
      var formatedTimeNew = KeduIje.convertToTime(edit.newValues[field]);
    return <p>
          {label}
          <a href={timeUrl}>({formatedTimeOld})</a>
          <span className="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>
          <a href={timeUrl}>({formatedTimeNew})</a>
        </p>;
    }
    return null;
  }

  eachEdit(songUrl, edit, idx){

    var output= null;
    var startTime = KeduIje.convertToTime(edit.time);

    if(edit.type=="edit"){
      var textChange = null;
      var startTimeChange = null;
      var endTimeChange = null;
      if(edit.newValues.text){ //if a line edit
        var diff = JsDiff.diffChars(edit.original.text, edit.newValues.text);
        var changes = diff.map(this.eachDiff);
        textChange = <p>
            <a href={songUrl+"#"+edit.time}>({startTime})</a>
            <span className="glyphicon glyphicon-pencil" aria-hidden="true"></span>
            <strong>{changes}</strong>
          </p>;
       
      }

      if(edit.newValues.startTime){
        startTimeChange = <p>
          start time moved to <a href={songUrl+"#"+edit.time}>({startTime})</a>
        </p>;
      }
      startTimeChange = this.changedTimeMark("Start :", edit, "startTime", songUrl+"#"+edit.time);
      endTimeChange = this.changedTimeMark("End :", edit, "endTime", songUrl+"#"+edit.time);

      output = <span data-id={edit._id}>
            {textChange}
            {startTimeChange}
            {endTimeChange}
          </span>;
    }else if(edit.type=="deletion"){//if a deletion
       
        output = <p className="deleted-line">
          <a href={songUrl+"#"+edit.time}>({startTime})</a>
          <span className="glyphicon glyphicon-trash" aria-hidden="true"></span>
          <strong >{edit.original.text}</strong>
        </p>;
      
    }else if(edit.type=="info"){ //if an info edit

        var textOutput, artistOutput, imgOutput = null;
        if(edit.newValues.title){
          textOutput = this.changedInfo("title", edit);
        }

        if(edit.newValues.artist){
          artistOutput = this.changedInfo("artist", edit);
        }

        if(edit.newValues.img){
          imgOutput = <p>changed art work</p>;
        }

        output = <span>{textOutput} {artistOutput} {imgOutput}</span>;

    }else if(edit.type=="add"){
      output = <p>
        <a href={songUrl+"#"+edit.time}>({startTime})</a>
        <span className="glyphicon glyphicon-plus" aria-hidden="true"></span>
        <strong>{edit.text}</strong>
      </p>;
    }else if(edit.type=="removal"){ //todo: should have own panel
      output = <p>
        Removed this song
      </p>;
    }

    var debug = false;
    return <li className="list-group-item" key={edit._id}>
            {output}
            {debug && <pre>{JSON.stringify(edit)}</pre>}
          </li>;

  }

  listEdits(changesetID, songUrl){
    var edits = (this.state.adds[changesetID]||[]).concat((this.state.edits[changesetID]||[]));
    edits.sort((a,b)=>{return (a.time-b.time); });

    var editsHTML = edits.map(this.eachEdit.bind(this, songUrl));

    return editsHTML.length ? <ul className="list-group">{editsHTML}</ul> : null;
  }

  eachChangeset(changeset, idx){

    var song = null;
    var songUrl=null;
    var songTitle = null;
    var songImg = null;
    var output= null;      
      
    if(changeset.type=="new"){

      song = this.state.listings[changeset._id]

      if(song) {
        songUrl="/music/"+song.slug;
        songTitle = <a className="song-title" href={songUrl}>{song.title}</a>;
        songImg = song.img;
      

        output=<div className="media">
          <div className="media-left">
            <a href={songUrl}>
              <img className="media-object" src={songImg} alt={songTitle} style={{width: "200px"}} />
            </a>
          </div>
          <div className="media-body">
            <h4 className="media-heading">Added</h4>
            {true || <pre>{JSON.stringify(changeset)}</pre>}
          </div>
      </div>;
      }
    }else{
      song = this.state.songs[changeset.mediaID];
      if(song) {
        songUrl="/music/"+song.slug;
        songTitle = <a className="song-title" href={songUrl}>{song.title}</a>;
      }
      output = this.listEdits(changeset._id, songUrl);
    }


    return output ? <div
        className="panel panel-default"
        key={changeset._id}
      >
        <div className="panel-heading">
          {songTitle}
          <span className="label label-default">{changeset.date.toLocaleString()}</span>
        </div>
        <div className="panel-body">
          {output}
        </div>
      </div> : null;

  }

  render () {

    var history = this.state.changesets.sort((a,b)=>{return (b.date-a.date);});
    var activityDisplay = history.map(this.eachChangeset);

    return <div className="">
        {activityDisplay}
        {this.state.showMoreBtn && <button onClick={this.loadMoreChangesets}> Load More </button>}
      </div>;

  }
}
