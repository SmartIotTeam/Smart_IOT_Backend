const express = require('express');
const app = express();
const { conn } = require("./config/config");
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const mqtt = require("mqtt"),
    client = mqtt.connect("mqtt://broker.hivemq.com:1883");


app.use(express.urlencoded({ extended: false, limit : "50mb" }))
app.use(express.json({limit : "50mb"}))
app.use(express.static('public'));

conn.connect((err) => {
    if (err) {
        console.log(err)
    }
    else {
        console.log('mysql connecting...')
    }
})

const s3 = new aws.S3({
    accessKeyId: process.env.S3_KEYID,
    secretAccessKey: process.env.S3_PRIVATE_KEY,
    region: process.env.REGION,
});

let upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            cb(null, `${Date.now()}_${file.originalname}`);
        },
    }),
});

const topic = "SmartIoT/sub"

client.on("connect", (_) => console.log("Connect"));
    client.subscribe(topic, { qos: 1 }, (_) => console.log("subscribe!"));
    client.on("message", (topic, message) => {
        const _data = JSON.parse(message.toString());
            console.log(`${_data.chat}`);
    });

app.get('/', (req, res) => {
    res.status(200).json({
        massage: "인덱스 화면과 연결 잘 됨."
    });
});

app.post('/image_upload', upload.single('imageFile'), (req, res) => {
    console.log(req.file)
    const image_path = req.file.location
    const cloth_name = req.body.cloth_name
    conn.query(`insert into imageTable(image_path, name) value('${image_path}', '${cloth_name}')`, (err, result) => {
        if (err) {
            res.json({ 'massage': err });
        } else {
            conn.query(`select max(id) as mid, count(id) as cid, name from imageTable`, (err, result) => {
                if (err) {
                    res.json({ 'massage': err, success: false });
                } else {
		     client.publish(topic, `register ${result[0].mid}`)
	             client.subscribe(topic, { qos: 1 }, (_data) => {
		     if(_data != null) {
			console.log("성공")
		     } else {
			console.log("실패")
		    }
	          });
                    res.json({
                        image_index : result[0].mid,
                        count_id : result[0].cid,
			image_path : image_path,
			cloth_name : result[0].name,
			success: true
                    })
                }
            })
        }
    })
});

app.get('/get_items', (req, res) => {
  let arr = new Array()
  conn.query(`select count(id) as cid from imageTable`, (err, result) => {
	if(err) {
	   res.json({message : err, success: false})
	} else {
	   const num = result[0].cid
	   conn.query(`select * from imageTable`, (err, result) => {
		if(err) res.json({message: err, success: false})
                else {
		   for(let i = 0; i < num; i++) {
                      arr.push({id : result[i].id, cloth_name : result[i].name, image_path : result[i].image_path})
		   }
		   res.json({
		       data : arr,
		       count : num,
		       success: true
		   })
		}
	   })
	 }
  }) 
})

app.get('/random', (req, res) => {
	const random_num = req.query.rnum
	client.publish(topic, `ran ${random_num}`)
	client.subscribe(topic, { qos: 1 }, (_data) => {
		console.log(_data)
		if(_data != null) {
			return res.json({message : "IOT 디바이스와 통신 됨.", success : true})
		} else {
			return res.json({message : "IOT 디바이스와 통신 실패.", success : false})
		}
	});
})

let port = process.env.PORT || 8888;
app.listen(port, () => {
    console.log('server on! http://localhost:' + port);
});
