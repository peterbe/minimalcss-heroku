import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  NavLink,
  Switch
} from 'react-router-dom';

import './App.css';
import Home from './Home';
import About from './About';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // message: null,
      // fetching: true
    };
  }

  toggleNavbarMenu = event => {
    event.preventDefault();
    console.log('work harder');
  };

  render() {
    return (
      <Router>
        <section className="hero is-info is-fullheight">
          <div className="hero-head">
            <nav className="navbar">
              <div className="container">
                <div className="navbar-brand">
                  <NavLink className="navbar-item" to="/">
                    <img
                      src="https://bulma.io/images/bulma-type-white.png"
                      alt="Logo"
                    />
                  </NavLink>
                  <span
                    onClick={this.toggleNavbarMenu}
                    className="navbar-burger burger"
                    data-target="navbarMenu"
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <div id="navbarMenu" className="navbar-menu">
                  <div className="navbar-end">
                    <NavLink to="/" className="navbar-item is-active">
                      Home
                    </NavLink>
                    <NavLink to="/about" className="navbar-item">
                      About minimalcss
                    </NavLink>
                    <span className="navbar-item">
                      <a
                        className="button is-white is-outlined is-small"
                        href="https://github.com/peterbe/minimalcss-heroku"
                      >
                        <span className="icon">
                          <i className="fa fa-github" />
                        </span>
                        <span>View Source</span>
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </nav>
          </div>
          <Switch>
            <Route path="/" exact component={Home} />
            {/* <Redirect from="/old-match" to="/will-match"/> */}
            <Route path="/about" component={About} />
            <Route component={NoMatch} />
          </Switch>
          HOME
        </section>
      </Router>
    );
  }
}

export default App;

const NoMatch = ({ location }) => (
  <div>
    <h3>
      No match for <code>{location.pathname}</code>
    </h3>
  </div>
);
