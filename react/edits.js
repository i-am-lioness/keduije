
class Edits extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      edits: []
    };

    this.eachEdit = this.eachEdit.bind(this);
    this.eachDiff = this.eachDiff.bind(this);
    this.setEdits = this.setEdits.bind(this);

  }

  componentWillMount(){
    KeduIje.getRevisions(this.setEdits);
  }

  setEdits(edits){
    console.log(edits);
    this.setState({edits: edits});
  }

  eachDiff(diff,i){

    var className = null;
    if(diff.added)
      className="added";
    else if(diff.removed)
      className="removed"

    return <span className={className} key={i}>{diff.value}</span>;
  }

  eachEdit(edit, idx){

    var diff = JsDiff.diffChars(edit.original.text, edit.newValues.text);
    var changes = diff.map(this.eachDiff);
    return <div
        className="edit"
        key={edit._id}
      >
        {changes}
      </div>;

  }

  render () {

    var edits = this.state.edits.map(this.eachEdit);

    return <div>
        {edits}
      </div>;

  }
}
