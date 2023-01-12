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

let flag = "default";

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
            conn.query(`select max(id) as mid, count(id) as cid from imageTable`, (err, result) => {
                if (err) {
                    res.json({ 'massage': err, success: false });
                } else {
		     const mid = result[0].mid
		     const cid = result[0].cid
		     client.publish(topic, `register ${mid}`)
	             setTimeout(() => {
	               console.log(flag)
	               if(flag === "register") {
	                 console.log("성공")
	               } else {
	                 res.json({message : "IOT하고 연동 실패", success : false})
	               }
                     }, 1000)

		  console.log(mid)
		  conn.query(`select name from imageTable where id = ${mid}`, (err, result) => {
			if(err) res.json({message : err, success : false})
			res.json({
                         image_index : mid,
                         count_id : cid,
			 image_path : image_path,
			 cloth_name : result[0].name,
			 success: true
                       })
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
	setTimeout(() => {
	  console.log(flag)
	  if(flag === "random") {
	     res.json({success : true})
	  } else {
	     res.json({success : false})
	  }
       }, 1000)
})

client.on('message', (topic, message, packet) => {
	console.log("message is "+message+" topic is "+topic);
	if(message == 'rancom') {
		console.log("random complete");
		flag = "random"
	}
	else if(message == 'com') {
		console.log("register complete");
		flag = "register"
	}
});

let port = process.env.PORT || 8888;
app.listen(port, () => {
    client.subscribe("SmartIoT/pub", {qos:1});
    console.log('server on! http://localhost:' + port);
});
