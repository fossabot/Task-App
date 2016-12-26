import React from 'react'
import { getJSON } from 'io-square-browser'
import Modal from 'react-modal'
import io from 'Socket'
const socket = io()
import Chat from 'Chat'
import moment from 'moment'
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table'
import Comment from 'material-ui/svg-icons/action/question-answer'
import FlatButton from 'material-ui/FlatButton'
import Dialog from 'material-ui/Dialog'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import ContentAdd from 'material-ui/svg-icons/content/add'
import { IndexLink, Link } from 'react-router'

const customContentStyle = {
  position: 'fixed',
  top: '30px',
  left: '20%',
  width: '60%',
  maxWidth: 'none'
}


const Dashboard = React.createClass({
  componentWillMount: function () {
    getJSON('/getdashboard')
      .then((reply) => {
        this.setState({
          taskby: reply.taskby,
          user_id: reply.user_id,
          taskto: reply.taskto,
          userlist: reply.userlist,
          chats: [],
          selectable: false
        })
      })
  },
  handleOpen: function (e) {
    let that = this
    this.setState({
      chattitle: e.title,
      open: true,
      userid: this.state.userlist[this.state.user_id],
      chatid: e.id
    })
    socket.emit('join', {chatroom: e.id,user: this.state.userlist[e.taskto]})
    socket.on('recieved-chats', function (data) {
      let chats = that.state.chats
      chats.push(data)
      console.log(data)
      that.setState({
        chats: chats
      })
    })
  },
  handleClose: function () {        socket.emit('leave', {chatroom: this.state.chatid,username: this.state.userid})
    this.setState({open: false,
      chats: []
    }
    )
  },
  sendMessage: function () {
    let time = moment().format('HH:mm:ss DD-MM-YY')
    socket.emit('chat message', {chatroom: this.state.chatid,username: this.state.userid,uid: this.state.uid,message: this.refs.chatmessage.value,time: time})
    this.refs.chatmessage.value = ''
  },

  render: function () {
    const actions = [
      <form id='chatform' action='' onSubmit={this.sendMessage}>
        <input
          type='text'
          ref='chatmessage'
          autocomplete='off'
          required='required'
          style={{ border: '0', padding: '2px', width: '86%', height: '28px', fontSize: '20px'}} />
        <FlatButton
          type='submit'
          label='Submit'
          primary={true}
          style={{width: '10%'}} />
      </form>

    ]

    var that = this
    if (!this.state) {
      return (    <div className='row'>
                    <br/>
                    <table className='data-tables'>
                      <thead>
                        <h1>Patience You Must Have My Young Padawan</h1>
                      </thead>
                    </table>
                  </div>
      )
    }

    return (
      <div className='row'>
        <Table selectable={false}>
          <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
            <TableRow>
              <TableHeaderColumn style={{textAlign: 'center',fontSize: '17px',fontWeight: 'bold'}}>
                Task Name
              </TableHeaderColumn>
              <TableHeaderColumn style={{textAlign: 'center', fontSize: '17px',fontWeight: 'bold'}}>
                Task Details
              </TableHeaderColumn>
              <TableHeaderColumn style={{textAlign: 'center',fontSize: '17px',fontWeight: 'bold'}}>
                Assigned By
              </TableHeaderColumn>
               <TableHeaderColumn style={{textAlign: 'center',fontSize: '17px',fontWeight: 'bold'}}>
                Assigned To
              </TableHeaderColumn>
              <TableHeaderColumn style={{textAlign: 'center', fontSize: '17px',fontWeight: 'bold'}}>
                Assigned On
              </TableHeaderColumn>
              <TableHeaderColumn style={{textAlign: 'center', fontSize: '17px',fontWeight: 'bold'}}>
                Due Date
              </TableHeaderColumn>
              <TableHeaderColumn style={{textAlign: 'center', fontSize: '17px',fontWeight: 'bold'}}>
                Status
              </TableHeaderColumn>
              <TableHeaderColumn style={{textAlign: 'center',fontSize: '17px',fontWeight: 'bold'}}>
                Comments
              </TableHeaderColumn>
              <TableHeaderColumn style={{textAlign: 'center',fontSize: '17px',fontWeight: 'bold'}}>
                Action
              </TableHeaderColumn>
            </TableRow>
          </TableHeader>
          <TableBody displayRowCheckbox={false}>
            {this.state.taskto.map(function (val) {
               return (
                 <TableRow key={val.id}>
                   <TableRowColumn title={val.title} style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.title}
                   </TableRowColumn>
                   <TableRowColumn title={val.details} style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.details}
                   </TableRowColumn>
                   <TableRowColumn title={that.state.userlist[val.taskby]} style={{textAlign: 'center',fontSize: '15px'}}>
                     {that.state.userlist[val.taskby]}
                   </TableRowColumn>
                    <TableRowColumn title={that.state.userlist[val.taskto]} style={{textAlign: 'center',fontSize: '15px'}}>
                     {that.state.userlist[val.taskto]}
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.date}
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.duedate}
                   </TableRowColumn>
                   <TableRowColumn className={val.status} title={val.status} style={{textAlign: 'center', fontSize: '15px'}}>
                     {val.status}
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center'}}>
                     <FlatButton icon={<Comment/>} onClick={that.handleOpen.bind(this, val)} />
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center'}}>
                     <FlatButton primary={true} labelStyle={{padding:2}} label='Change Status' href={'/updatetask/' + val.id + '/' + val.taskto + '/' + val.status} />
                   </TableRowColumn>
                 </TableRow>
               )
             })}
            {this.state.taskby.map(function (val) {
               return (
                 <TableRow key={val.id}>
                   <TableRowColumn title={val.title} style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.title}
                   </TableRowColumn>
                   <TableRowColumn title={val.details} style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.details}
                   </TableRowColumn>
                    <TableRowColumn title={that.state.userlist[val.taskby]} style={{textAlign: 'center',fontSize: '15px'}}>
                     {that.state.userlist[val.taskby]}
                   </TableRowColumn>
                   <TableRowColumn title={that.state.userlist[val.taskto]} style={{textAlign: 'center',fontSize: '15px'}}>
                     {that.state.userlist[val.taskto]}
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.date}
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center',fontSize: '15px'}}>
                     {val.duedate}
                   </TableRowColumn>
                   <TableRowColumn title={val.status} className={val.status} style={{textAlign: 'center', fontSize: '15px'}}>
                     {val.status}
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center'}}>
                     <FlatButton icon={<Comment/>} onClick={that.handleOpen.bind(this, val)} />
                   </TableRowColumn>
                   <TableRowColumn style={{textAlign: 'center'}}>
                     <FlatButton secondary={true} label='Delete' href={'/delete/' + val.id + '/' + val.taskby} />
                   </TableRowColumn>
                 </TableRow>
               )
             })}
          </TableBody>
        </Table>
        <Dialog
          title={this.state.chattitle}
          modal={false}
          actions={actions}
          open={this.state.open}
          onRequestClose={this.handleClose}
          autoScrollBodyContent={true}
          contentStyle={customContentStyle}>
          <Chat chats={this.state.chats} chatid={this.state.chatid} uid={this.state.user_id} />
        </Dialog>
        <Link to='/create' activeClassName='active'>
        <FloatingActionButton style={{ position: 'fixed',bottom: '5%',right: '5%'}}>
          <ContentAdd />
        </FloatingActionButton>
        </Link>
      </div>
    )
  }
})

module.exports = Dashboard
