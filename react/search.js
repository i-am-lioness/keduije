
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

class Search extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
      results: []
    };

    this.toggleExpand = this.toggleExpand.bind(this);
    this.query = this.query.bind(this);
    this.listResults = this.listResults.bind(this);
    this.eachResult = this.eachResult.bind(this);
    this.showMobileSearch = this.showMobileSearch.bind(this);
  }

  toggleExpand(val){
    if(!val) //delay needed because it seems onBlur fires before onClick is processed for link
     setTimeout(this.setState.bind(this, {active:false}), 500);
    else
      this.setState({active: val});
  }

  query(e){
    var q=e.target.value;

    if (q)
      KeduIje.search(q, this.listResults);
  }

  listResults(songs){
    console.log(songs);
    this.setState({
      results: songs
    });
  }

  eachResult(result){
    var url = "/music/" + result.slug;
    var label = (result.artist)? result.artist + " - "+result.title : result.title;
    return <div key={result.slug} className="search-result">
      <a href={url} >{label}</a>
    </div>;
  }

  showMobileSearch(){
    this.setState({
      visible: "visible"
    });

  }

  render () {

    var spanClass = (this.props.mobile && this.state.visible)? "mobile-search" : null;

    var results = this.state.results.map(this.eachResult);
    return <span className={spanClass}>
      <input
        className={"form-control "+this.state.visible}
        type="text"
        placeholder="  Search"
        onFocus={this.toggleExpand.bind(this, true)}
        onBlur={this.toggleExpand.bind(this, false)}
        style={{width: (!this.props.mobile && this.state.active)? "500px" : null}}
        onChange={this.query}
      />
      <span className= "glyphicon glyphicon-search" aria-hidden="true" onClick={this.props.mobile && this.showMobileSearch}></span>
      { <div className="search-results">{results}</div>}
    </span>

  }
}
