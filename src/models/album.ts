import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const AlbumSchema = new Schema(
  {
      id: {type: String, required: true},
      title: {type: String, required: true},
      mediaItemIds: [String],
  }
);

// export const Album = mongoose.model('Album', AlbumSchema);
export default mongoose.model('Album', AlbumSchema);
