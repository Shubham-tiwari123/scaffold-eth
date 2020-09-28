/* eslint-disable */
import React, {useEffect, useState} from 'react'
import { Header, Image } from 'semantic-ui-react'
import {Transactor} from "../helpers";
import {useContractLoader} from "../hooks";
const index = require('../lib/e2ee.js')

export default function Profile(props) {

    console.log('Profile:',props)
    const tx = Transactor(props.injectedProvider,props.gasPrice);
    const writeContracts = useContractLoader(props.injectedProvider);
    const fromUser = props.address

    const [user, setUser] = useState({})

    useEffect(() => {
        index.getAllUsers(fromUser, tx, writeContracts).then(result =>{
            console.log(result)
            if(result.caller) {
                console.log(result.caller)
                setUser(result.caller)
            }
        })
    }, [writeContracts] )

    return (
        <Header as='h2'>
            <Image circular src='https://react.semantic-ui.com/images/avatar/large/patrick.png' /> {user.name}
        </Header>
    )
}
