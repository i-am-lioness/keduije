
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

class Search extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      width: null
    };

    this.toggleExpand = this.toggleExpand.bind(this);
  }

  toggleExpand(val){
    this.setState({width: val? "500px": null});
  }

  render () {
    return <span>
      <input
        className="form-control"
        type="text"
        placeholder="Search"
        onFocus={this.toggleExpand.bind(this, true)}
        onBlur={this.toggleExpand.bind(this, false)}
        style={{width: this.state.width}}
      />
      <span className= "glyphicon glyphicon-search" aria-hidden="true"></span>
    </span>

  }
}
