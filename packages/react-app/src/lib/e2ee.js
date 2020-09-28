/* eslint-disable */
const AWS = require('aws-sdk')
const wallet = require('wallet-besu')
const fileDownload = require('js-file-download')
const e2e = require('./e2e-encrypt.js')

AWS.config.update({
    region: 'ap-south-1',
    accessKeyId: '******************',
    secretAccessKey: '*********************************'
})
let s3 = new AWS.S3();

const registerUser = async function(name, email, privateKey, tx, writeContracts){
    try {
        let publicKey = e2e.getPublicKey(privateKey)
        publicKey = publicKey.toString("hex")
        const result = await tx(writeContracts.E2EEContract.registerUser(
            name, email, publicKey
        ))
        console.log("Register res:",result)
        return true
    }catch(err){
        throw err
    }
}

const createWallet = async function(password){
    return await wallet.create(password,"orion key1")
}

const getAllAccounts = async function(password){
    return await wallet.login(password)
}

const loginUser = async function(privateKey, tx, writeContracts){
    try {
        let publicKey = e2e.getPublicKey(privateKey)
        publicKey = publicKey.toString("hex")
        const result = await tx(writeContracts.E2EEContract.updatePublicKey(
            publicKey
        ))
        console.log("Login:",result)
        return true
    }catch (err) {
        throw err
    }
}

const getAllUsers = async function(loggedUser, tx, writeContracts){
    const registeredUsers = await tx(writeContracts.E2EEContract.getAllUsers())
    let caller
    let userArray = []
    for (let i = 0; i < registeredUsers.length; i++){
        const result = await tx(writeContracts.E2EEContract.storeUser(registeredUsers[i]))
        if (loggedUser.toLowerCase()!==registeredUsers[i].toLowerCase()) {
            const value = {
                address: registeredUsers[i],
                name: result.name,
                key: result.publicKey,
            }
            userArray.push(value)
        }else{
            caller ={
                address: registeredUsers[i],
                name: result.name,
                key: result.publicKey,
            }
        }
    }
    const userDetails = {
        userArray:userArray,
        caller:caller
    }
    return userDetails
}

const storeFileAWS = function (awsKey, encryptedData){
    return new Promise((resolve,reject) =>{
        s3.putObject({
            Bucket: 'secure-doc-test',
            Key: awsKey,
            Body: encryptedData
        }, function (error, data) {
            if (error != null) {
                reject(false)
            } else {
                resolve(true)
            }
        })
    })
}

const getFileAWS = function (key){
    return new Promise((resolve,reject) =>{
        s3.getObject({
            Bucket: 'secure-doc-test',
            Key: key
        },function(error, data){
            if (error != null) {
                reject(error)
            } else {
                resolve(data.Body)
            }
        })
    })
}

const uploadFile = async function(party, file, password, setSubmitting, tx, writeContracts){

    let encryptedKeys=[]
    let userAddress=[]
    const cipherKey = await e2e.generateCipherKey(password)
    const fileSplit = file.name.split(".")
    const fileFormat = fileSplit[fileSplit.length - 1]
    let reader = new FileReader()
    reader.readAsArrayBuffer(file)

    reader.onload = async (val) => {
        const fileInput = new Uint8Array(val.target.result)
        const encryptedFile = await e2e.encryptFile(Buffer.from(fileInput), cipherKey)

        const fileHash = e2e.calculateHash(fileInput)

        for (let i=0;i<party.length;i++){
            let aesEncKey = await e2e.encryptKey(Buffer.from(party[i].key,"hex"), cipherKey)
            let storeKey = {
                iv: aesEncKey.iv.toString("hex"),
                ephemPublicKey: aesEncKey.ephemPublicKey.toString("hex"),
                ciphertext: aesEncKey.ciphertext.toString("hex"),
                mac: aesEncKey.mac.toString("hex")
            }
            encryptedKeys.push(JSON.stringify(storeKey))
            userAddress.push(party[i].address)
        }
        const awsFileKey = fileHash.toString("hex").concat(".").concat(fileFormat)

        storeFileAWS(awsFileKey, encryptedFile).then(()=>{
            tx(writeContracts.E2EEContract.uploadDocument(
                42,
                fileHash.toString("hex"),
                awsFileKey,
                encryptedKeys,
                userAddress
            )).then((receipt)=>{setSubmitting(false)})
        }).catch((err)=>{
            console.log("ERROR: ",err)
        })

    }
}

const getAllFile = async function(tx, writeContracts){
    return await tx(writeContracts.E2EEContract.getAllDocIndex())
}

const downloadFile = async function (docIndex,password, tx, writeContracts){

    let cipherKey = await tx(writeContracts.E2EEContract.getCipherKey(docIndex))
    cipherKey = JSON.parse(cipherKey)
    const document = await tx(writeContracts.E2EEContract.getDocument(docIndex))
    let encryptedKey = {
        iv: Buffer.from(cipherKey.iv,"hex"),
        ephemPublicKey: Buffer.from(cipherKey.ephemPublicKey,"hex"),
        ciphertext: Buffer.from(cipherKey.ciphertext,"hex"),
        mac: Buffer.from(cipherKey.mac,"hex")
    }

    const privateKey = await wallet.login(password);
    const decryptedKey = await e2e.decryptKey(privateKey[0],encryptedKey)
    const documentHash = document.documentHash
    const documentLocation = document.documentLocation

    const fileSplit= documentLocation.split(".")
    const fileFormat = fileSplit[fileSplit.length - 1]

    return new Promise((resolve)=>{
        getFileAWS(documentLocation).then((encryptedFile) =>{
            e2e.decryptFile(encryptedFile, decryptedKey).then((decryptedFile)=>{
                const hash2 = e2e.calculateHash(new  Uint8Array(decryptedFile)).toString("hex")
                fileDownload(decryptedFile,"res2".concat(".").concat(fileFormat))
                resolve(true)
            })
        })
    })

}

module.exports ={
    registerUser,
    loginUser,
    createWallet,
    getAllAccounts,
    getAllUsers,
    uploadFile,
    getAllFile,
    downloadFile
}
