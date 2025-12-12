// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Fashion', 'Books', 'Art', 'Home & Garden', 'Sports', 'Accessories', 'Apparel', 'Badges', 'Collectibles', 'Services', 'Other']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerName: {
    type: String,
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  status: {
    type: String,
    enum: ['draft', 'listed', 'sold', 'archived', 'pending'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
  },
  tags: [String],
  condition: {
    type: String,
    enum: ['new', 'like_new', 'good', 'fair'],
    default: 'good'
  },
  location: {
    district: String,
    club: String
  },
  isNegotiable: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ featured: 1 });

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `Rs. ${this.price.toLocaleString('en-LK')}`;
});

// Virtual for seller info
productSchema.virtual('sellerInfo', {
  ref: 'User',
  localField: 'seller',
  foreignField: '_id',
  justOne: true
});

// Static method to get marketplace stats
productSchema.statics.getMarketplaceStats = async function() {
  const stats = await this.aggregate([
    {
      $facet: {
        totalProducts: [{ $count: "count" }],
        byCategory: [
          { $group: { _id: "$category", count: { $sum: 1 }, totalValue: { $sum: { $multiply: ["$price", "$stock"] } } } }
        ],
        byStatus: [
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ],
        bySeller: [
          { $group: { 
              _id: "$seller", 
              sellerName: { $first: "$sellerName" },
              productCount: { $sum: 1 },
              totalValue: { $sum: { $multiply: ["$price", "$stock"] } }
            } 
          },
          { $sort: { productCount: -1 } },
          { $limit: 10 }
        ],
        recentProducts: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          { $project: { title: 1, price: 1, category: 1, status: 1, createdAt: 1, sellerName: 1 } }
        ],
        totalValue: [
          { $group: { _id: null, total: { $sum: { $multiply: ["$price", "$stock"] } } } }
        ]
      }
    }
  ]);

  return stats[0];
};

module.exports = mongoose.model('Product', productSchema);