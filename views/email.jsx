import React, { Component } from 'react';
import { Col, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import PropTypes from 'prop-types';
import axios from 'axios';


export default class Email extends Component {
  constructor(props) {
    super(); // Or else everything breaks
    
    this.state = {
      transcriptedMessage: props.chatToSend,
      mail: "",
    };

    // What we want most of the time.
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async handleSubmit(e) {
    e.preventDefault()

    const { transcriptedMessage, mail } = this.state;

    const form = await axios.post('/api/form', {
      transcriptedMessage,
      mail,
    })
  }

  render() {
    return (
      <div>
        <Form onSubmit={this.handleSubmit}>
            <FormGroup row>
                <Label for="mail" sm={2}>Email</Label>
                <Col sm={10}>
                    <Input className="inputEmail" type="email" name="mail"  placeholder="Please input the email. " />
                </Col>
            </FormGroup>
            <FormGroup check row>
          <Col sm={{ size: 10, offset: 2 }}>
            <Button>Submit</Button>
          </Col>
        </FormGroup>
        </Form>
      </div>
    )
  }
}
