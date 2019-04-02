import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

// mediaItem
//  baseUrl: string
//  filename: string
//  id: string
//  mediaMetadata: object
//    creationTime: string
//    height: string
//    photo: object
//      apertureFNumber: number
//      cameraMake: string
//      focalLength: number
//      isoEquivalent: number
//    width: string
//  mimeType: string
//  productUrl: string
/*
{
    "id": "AEEKk92PHkbVhHNqd39TzaM6CGCIBk7oLiXwP4mnFK9EAJGAPSJJ94jHsJ3YD0HvKAr6RaofdyKvokaoTSdI7UIuDXuLun_q_g",
    "baseUrl": "https://lh3.googleusercontent.com/lr/AJ-Ewvmr81MMDTBFE-i4aXGx56sUdUDL3wHVTWHb29I1k5Ee_NtQMVu1UZ_buetPV4n2kO5HrfYjqLaFpeXSJH-PWA2niMtipew2VWOM46WdpV_Oejd12Pyhjam8HeS76YZbRX9rK9qFP0ubTvk8-9QDhz7UmDy_THjXYQVmRF0-kue9jdZmLqOuiWb6u7fFb8jXIY8uM6UY3Wz0OBWeF9Jk0pHx0sCEiKmWOoN0zrmBrt41hAQTTbENslUj6n5GgWpWObtxXd_rHdzasP4ZO-A5dFVAbULYyEYAqPKdLe44gHGALvj93wy6wA6S-StMdhYgakci4ycBySPXTOB9STmI87uGoV8Gm70qjBGHzpLEMxQp5F3o8R79tzQxfW0-15-0_ygQSm2VYMDZ_ag56c-DiZD3NrCoLUf3ynvIv5okQnZP1PM_YzbqaOB2BWUQbeKBN1hWALaO0pxz8PaPrxHvoiGQ-GHkOpw84kcT_3z9pQG_6HJKbWWuDe-8gRe3lp9JjXw-A3rFSAUlGS3UvrdQNh2MvRcLCey_uWW-UmG2d-w-0eIp6uzQorv_DZaq6GcmXR78dpM5UHNb1gA9tV8kyh-tYAXzXdW8ILHcrg0NumbdWfItC_hHIZExFXkw6jG7p1YGxly2oyiBZj12AhnPZy3sNc81fZCWqhurtX-pRjEsdf51mr1qlKKi9xKaWSk7Y0WY5f8tHbpJbPBwP0Sgx6x3W_F_7kLL7RohNQNeyEQw5invwsbcbpujvK1wpIvprGYMUa2bjbHMIzkH-V8d_U1uxFIoSYNNIm-vsSdChevyJKuW3rcDfz-OEojaDn0K7PuIH_AcCA65oHtNswdxuzO2gE-bh1myxc0onzRCrzKiRPP6h0sYkmUoHbZm3DY7dk8",
    "fileName": "35.JPG",
    "downloaded": true,
    "filePath": "",
    "productUrl": "https://photos.google.com/lr/photo/AEEKk92PHkbVhHNqd39TzaM6CGCIBk7oLiXwP4mnFK9EAJGAPSJJ94jHsJ3YD0HvKAr6RaofdyKvokaoTSdI7UIuDXuLun_q_g",
    "mimeType": "image/jpeg",
    "creationTime": {
        "$date": "1995-01-22T04:59:08.000Z"
    },
    "width": 601,
    "height": null,
}
*/
const MediaItemSchema = new Schema(
  {
    id: { type: String, required: true },
    baseUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    downloaded: { type: Boolean, default: false },
    filePath: { type: String, default: '' },
    productUrl: { type: String },
    mimeType: { type: String },
    creationTime: { type: Date },
    width: { type: Number },
    height: { type: Number },
  },
);


// Export model
// module.exports = mongoose.model('MediaItem', MediaItemSchema);
export default mongoose.model('MediaItem', MediaItemSchema);
