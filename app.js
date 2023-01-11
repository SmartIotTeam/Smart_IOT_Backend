const express = require('express');
const app = express();
const multer = require('multer');
const { conn } = require("./config/config");
const path = require('path');
const mqtt = require('mqtt');

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.static('public'));

conn.connect((err) => {
    if (err) {
        console.log(err)
    }
    else {
        console.log('mysql connecting...')
    }
})

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'public/image/');
        },
        filename: function (req, file, cb) {
            var newFileName = new Date().valueOf() + path.extname(file.originalname)
            cb(null, newFileName);
        }
    }),
});

app.get('/', (req, res) => {
    res.status(200).json({
        massage: "인덱스 화면과 연결 잘 됨."
    });
});

app.get('/image_upload', upload.single('imageFile'), (req, res) => {
    const image_path = '/image/' + req.file.filename
    conn.query(`insert into imageTable(image_path) value('${image_path}')`, (err, result) => {
        if (err) {
            res.json({ 'massage': err });
        } else {
            conn.query(`select max(id) as mid from imageTable`, (err, result) => {
                if (err) {
                    res.json({ 'massage': err });
                } else {
                    res.json({
                        image_index : result[0].mid
                    })
                }
            })
        }
    })
});

let port = 8888;
app.listen(port, () => {
    console.log('server on! http://localhost:' + port);
});