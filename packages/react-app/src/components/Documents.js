/* eslint-disable */
import React, {useEffect, useState} from 'react'
import {Button, Icon, Loader, Table} from 'semantic-ui-react'
const index = require('../lib/e2ee.js')

export default function Documents(props) {

    const password = localStorage.getItem('password')
    const [docs, setDocs] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // index.init().then(() => {
        //     index.getAllFile().then(
        //         (files) => {
        //             setDocs(files)
        //             setLoading(false)
        //         }
        //     )
        // })

    }, [])

    const getAllDoc = async () =>{
        setLoading(true)
        const result = await index.getAllFile(props.tx, props.writeContracts)
        if(result.length>0) {
            let docs = []
            for (let i = 0; i < result.length; i++) {
                docs.push(parseInt(result[i]))
            }
            setDocs(docs)
        }
        setLoading(false)
    }

    const downloadFile = (docIndex)=>{
        console.log('Downloading:',docs[docIndex])
        index.downloadFile(docs[docIndex],password, props.tx, props.writeContracts).then((result)=>{
            if(result)
                alert("File downloaded!")
            else
                alert("Some error occurred!")
        })
    }

    return (
        <div>
            <Button onClick={getAllDoc}>Get Docs</Button>
        <Table celled striped style={{maxWidth: '50%'}}>
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell colSpan='3'>Your documents</Table.HeaderCell>
                </Table.Row>
            </Table.Header>

            <Table.Body>
                {
                    !loading ?
                        docs.map((index) => {
                            return (
                                <Table.Row>
                                    <Table.Cell collapsing>
                                        <Icon name='file outline'/> Document {index}
                                    </Table.Cell>
                                    <Table.Cell>10 hours ago</Table.Cell>
                                    <Table.Cell collapsing textAlign='right'>
                                        <Button icon='download' onClick={()=>downloadFile(index)}/>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        ) :
                        <Loader active size='medium'>Loading
                        </Loader>
                }
            </Table.Body>
        </Table>
        </div>
    )
}
