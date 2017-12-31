import React from 'react';
import PropTypes from 'prop-types';

import Header from '../containers/header.jsx';
import Footer from '../containers/footer.jsx';
import Loader from '../containers/loader.jsx';

import KeystonesDisplay from './keystonesdisplay.jsx';
import PagesDisplay from './pagesdisplay.jsx';

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loaded: false,
			data: {}
		};

		makeRequest('/champ?name=' + this.props.name, data => {
			this.setState({
				loaded: true,
				data: data
			});
		});
	}

	render() {
		return (
	    	<React.Fragment>
			    {
			    	this.state.loaded ?
					<React.Fragment>
						<Header />
				    	<div id='center'>
				    		<div style={{ margin: '0 auto 70px auto', width: '800px' }}>
				    			<div style={{ marginTop: '12px'}}>
						    		<img style={{ width: '100px', height: '100px' }} src={'../assets/champion/' + this.state.data.name + '.png'} />
						    		<h1 style={{ display: 'inline', position: 'relative', bottom: '38px' }}>{this.state.data.name}</h1>
					    		</div>
					    		<div>
						    		<KeystonesDisplay data={this.state.data.keystones} />
						    		<PagesDisplay data={this.state.data.pages} />
					    		</div>
							</div>
						</div>
					</React.Fragment> :
		    		<Loader />
		    	}
		    	<Footer />
		    </React.Fragment>
		);
	}
}

App.propTypes = {
	name: PropTypes.string.isRequired
};

module.exports = App;

function makeRequest(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				console.log(xhr.responseText);
				callback(JSON.parse(xhr.responseText));
			}
			else {
				console.log('HTTP Error ' + xml.status);
				console.log(xml.responseText);
				console.log(xml.statusText);
			}
		}
	}
	xhr.open('GET', 'http://localhost:5000' + url, true);
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.send();
}