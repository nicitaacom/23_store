/**
 * Run once: npx tsx scripts/seedCategories.ts
 * Creates all parent + subcategories in 23_categories.
 * Safe to re-run — uses ON CONFLICT (name) DO NOTHING.
 */
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const parents = [
  "FEATURED",
  "Beauty & Health",
  "Food & Grocery",
  "Home & Kitchen",
  "Women's Clothing",
  "Women's Curve Clothing",
  "Women's Shoes",
  "Women's Lingerie & Lounge",
  "Men's Clothing",
  "Men's Shoes",
  "Men's Big & Tall",
  "Men's Underwear & Sleepwear",
  "Sports & Outdoors",
  "Jewelry & Accessories",
  "Toys & Games",
  "Automotive",
  "Kids' Fashion",
  "Kids' Shoes",
  "Baby & Maternity",
  "Bags & Luggage",
  "Patio, Lawn & Garden",
  "Arts, Crafts & Sewing",
  "Electronics",
  "Business, Industry & Science",
  "Tools & Home Improvement",
  "Appliances",
  "Office & School Supplies",
  "Health & Household",
  "Pet Supplies",
  "Cell Phones & Accessories",
  "Smart Home",
  "Musical Instruments",
  "Beachwear",
  "Furniture",
]

const subcategories: Record<string, string[]> = {
  "Beauty & Health": ["Hair Care","Temporary Tattoos","Hair Cutting Tools","Vision Care","Skin Care","Health Care Products","Oral Care","Personal Care","Facial care","Makeup","Wigs & Hair Extensions","False Eyelashes","Foot, Hand & Nail Care","Hair Styling Tools","Beauty Tools","Press on Nails","Shaving & Hair Removal","Nail Polish","Fragrance","Nail Tools","Nail Appliances","Refillable Containers","Makeup Bags & Storage","Nail Art","Bathing Accessories","Tattoo Tools","Hair Accessories","Body Paint & Makeup","Makeup Mirrors","Massage & Relaxation Equipment","Nail Powder"],
  "Food & Grocery": ["Snacks & Sweets","Beverages","Breads & Bakery","Pantry Staples","Deli & Prepared Foods","Produce","Food & Beverage Gifts","Dairy, Eggs & Plant-Based Alternatives","Breakfast Foods","Home Brewing & Winemaking","Meat & Seafood","Fresh Meal Kits","Meat Substitutes","Fresh Flowers & Plants"],
  "Home & Kitchen": ["Personalized Products","Home Decor Products","Kitchen Utensils & Supplies","Bedding","Kitchen Storage & Organization","Home Storage & Organization","Closet & Laundry Storage","Event & Party Supplies","Bath","Dining & Entertaining","Couch & Sofa Decor","Seasonal Decor","Window Treatments & Hardware","Rugs & Mats","Cleaning Supplies","Towels & Shower Curtains","Bakeware","Kitchen & Table Linens","Glassware & Drinkware","Cookware","Lighting & Accessories","Wall Art","Small Appliances & Accessories","Fans, Air Conditioners & Heating","Blankets & Throws","Coffee, Tea & Espresso","Travel & To-Go Drinkware","Vacuums & Floor Care","Food Service Equipment & Supplies","Air Quality","Kids' Home Store","Wine Making & Supplies","Irons & Steamers"],
  "Women's Clothing": ["Women's Dresses","Women's T-Shirt","Women's Two Piece Sets","Women's Blouses & Shirts","Women's Pants","Women's Tank Tops & Camis","Women's Athleisure","Women's Jeans","Women's Sweaters","Women's Coats & Jackets","Women's Skirts","Women's Shorts","Women's Jumpsuits","Women's Denim Shorts","Women's Wedding Event Wear","Women's Blazers","Maternity Clothing","Women's Skinny-Fit Pants","Women's Sweatshirts","Women's Denim Apparel","Women's Uniforms, Work & Safety","Women's Bodysuits","Women's Traditional & Cultural Wear","Women's Denim Skirts","Women's Denim Jackets & Coats","Sporty Sweatshirts","Women's Cosplay Costumes"],
  "Women's Curve Clothing": ["Curve Dresses","Curve Underwear","Curve T-shirts","Curve Blouses","Curve Loungewear & Sleepwear","Curve Two Pieces Set","Curve Pants","Curve Denim","Curve Coats & Jackets","Curve Cami&Tank Tops","Curve Leggings","Curve Sports Tops","Curve Sports Bottoms","Curve Knitwear","Curve Skirts","Curve Shorts","Curve Wedding Party Wear","Curve Jumpsuits & Bodysuits","Curve Cardigans","Curve Sports Bras","Curve Suits","Curve Sexy Lingerie & Costumes","Curve Sports Sets","Curve Traditional Wear","Curve Sweatshirt","Curve Sports Jackets","Curve Sports Dress","Curve Sports Bodysuits","Curve Activewear"],
  "Women's Shoes": ["Women's Heeled Sandals","Women's Platform & Wedge Sandals","Women's Fashion Sneakers","Women's Slide Sandals","Women's Flat Sandals","Women's Pumps","Women's Loafers & Slip-Ons","Women's Flats","Women's slippers","Shoe Accessories","Women's Flip Flops","Women's Mules & Clogs","Women's Ankle Boots & Booties","Women's Mid Calf Boots","Women's Knee High Boots","Shoe Decoration Charms","Women's Canvas Shoes","Women's Work & Safety Shoes","Women's Wide Fit Shoes","Women's Over the knee Boots","Women's Oxford Shoes"],
  "Women's Lingerie & Lounge": ["Women's Lingerie Set","Women's Panties","Women's Bras & Bralettes","Women's Sleepwear","Women's Shapewear","Women's Loungewear","Women's Stockings & Hosiery","Women's Lingerie Accessories","Women's Sexy Lingerie","Women's Shapewear Shorts"],
  "Men's Clothing": ["Men's T-Shirts","Men's Sets","Men's Casual & Dress Shirts","Men's Shorts","Men's Polos","Men's Casual Pants","Men's Jeans","Men's Jackets & Coats","Men's Suits & Separates","Men's Tops","Men's Hoodies & Sweatshirts","Men's Sweaters","Men's Cargo Pants","Men's Swimwear","Men's Pants","Men's Traditional & Cultural Wear","Men's Uniforms & Workwear"],
  "Men's Shoes": ["Men's Casual Shoes","Men's Sandals","Men's Loafers & Slip-Ons","Men's Slippers","Men's Semi-Formal Shoes","Men's Skateboarding Shoes","Men's Mules & Clogs","Men's Work & Utility Footwear","Men's Boots","Men's Canvas Shoes","Men's Snow Boots","Men's Wide Fit Shoes","Men's Rain Boots"],
  "Men's Big & Tall": ["Men's Plus Size Tops","Men's Plus Size T-Shirts","Men's Plus Size Shorts","Men's Plus Size Tracksuits & Sweatsuits","Men's Plus Size Pants","Men's Plus Size Jeans","Men's Plus Size Jackets & Coats","Men's Plus Size Suits & Separates","Men's Plus Size Hoodies & Sweatshirts","Men's Plus Size Cargo Pants","Men's Plus Size Sweaters","Men's Plus Size Swimwear"],
  "Men's Underwear & Sleepwear": ["Men's Underwear","Men's Loungewear","Men's Socks & Hosiery","Men's Shapewear","Men's Novelty Clothing","Thermal Underwear","Men's Exotic Apparel"],
  "Sports & Outdoors": ["Exercise & Fitness Items","Men's Activewear","Camping & Hiking","Men's Sports & Outdoor Shoes","Women's Activewear","Fishing","Sports & Outdoor Accessories","Women's Athletic Shoes","Cycling","Sports","Picnic & Camp Kitchen","Sports Medicine","Bags & Backpacks","Game Room & Backyard","Swimming, Diving & Water Sports","Hunting & Tactical Accessories","Sports Electronics & Gadgets","Outdoor Lights","Kids' Sports & Outdoor Clothing","Boat Items","Yoga & Fitness","Golf","Kids' Sports & Outdoor Shoes","Climbing & Survival Tools","Wide Fit Athletic & Outdoor Shoes","Electric Bikes","Winter Sports","Fan Shop"],
  "Jewelry & Accessories": ["Women's Jewelry","Men's Watches","Women's Eyewear","Women's Watches","Men's Jewelry","Men's Eyewear","Men's Hats & Caps","Women's Hats & Caps","Women's Costumes Accessories","Women's Belts","Men's Belts","Women's Scarves & Wraps","Women's Keyrings, Keychains & Charms","Men's Ties & Accessories","Men's Keyrings, Keychains & Charms","Watch Accessories","Women's Glasses Accessories","Hand Fans","Jewelry Boxes & Organizers","Jewelry Making Accessories","Women's Gloves & Mittens","Women's Buttons & Pins","Women's Wedding Accessories","Women's Faux Collar","Loose Gemstones","Costume Wigs","Cigarette Cases","Men's Scarves","Applique Patches","Men's Suspenders","Men's Gloves & Mittens","Face covering","Jewelry Cleaning & Care","Men's Accessories","Handbag Hangers","Women's Earmuffs","Men's Earmuffs"],
  "Toys & Games": ["Novelty & Gag Toys","Water Toys","Games & Accessories","Building Toys","Learning & Education","Novelty & Costumes","Vehicles","Drones & Flying Toys","Sports & Outdoor Play","Baby & Toddler Toys","Remote & App Controlled Vehicles & Parts","Craft Supplies & Stickers","Dolls & Accessories","Puzzles","Party Supplies","Stuffed Animals & Plush Toys","Drawing & Painting","Dress Up & Pretend Play","Toy Guns & Accessories","Electronic Toys","Toy Figures & Playsets","Trading Cards","Kids' Musical Instruments","Puppets & Puppet Theaters"],
  "Automotive": ["Replacement Parts","Tools & Equipment","Covers, Mats & Cushions","Interior Accessories","Exterior Accessories","Motorcycles & Powersports Accessories","Car Audio & Video","Car Exterior Care","Car Sunshades","Lights & Lighting Accessories","Tires & Wheels","Car Stickers","Car Interior Care","Motorcycle Gear","Car Storage & Organizers","Car Phone Holder","Hand Tools","RV Parts & Accessories","Keychains & Key Shells","RV Furniture","Oils & Fluids","Car GPS Accessories","Car Safety & Security"],
  "Kids' Fashion": ["Girls' Sets","Boys' Sets","Baby Sets","Girls' Dresses","Underwear & Pajamas","Girls' Pants","Baby One-Pieces","Kids' Socks","Boys' T-shirts","Girls' T-shirts","Boys' Pants","Baby Dresses","Baby Bottoms","Baby Tops","Girls' Swimwear","Kids' Watches","Kids' Hats & Caps","Baby Accessories","Kids' Jewelry","Girls' Jackets & Coats","Costumes & Accessories","Girls' Tops","Boys' Swimwear","Boys' Tops","Boys' Shirts","Kids' Hair Accessories","Boys' Jackets & Coats","Girls' Shirts","Kids' Bags","Kids' Backpacks","Ties, Belts, & Accessories","Kids' Gloves & Scarves","Kids' Keyrings & Keychains","Kids' Buttons & Pins"],
  "Kids' Shoes": ["Girls' Sandals & Slippers","Boys' Sandals & Slippers","Boys' Athletic","Girls' Sneakers","Boys' Sneakers","Girls' Loafers & Slip-Ons","Baby Girl Shoes","Girls' Athletic","Baby Boy Shoes","Girls' Boots","Boys' Loafers & Slip-Ons","Girls' Mules & Clogs","Girls' Pumps","Boys' Mules & Clogs","Boys' Boots"],
  "Baby & Maternity": ["Feeding","Nursery","Diapering","Baby Travel Gear","Baby Care","Strollers & Accessories","Potty Training","Baby Activity & Entertainment","Safety","Nursery Decor","Pregnancy & Maternity","Baby Gifts","Baby Storage & Organization","Baby Stationery"],
  "Bags & Luggage": ["Women's shoulder bags","Women's crossbody bags","Women's tote bags","Women's handbags","Luggage & Travel Gear","Women's Clutches & Evening Bags","Women's Backpacks & Bookbags","Men's Wallets & Card Cases","Casual Daypacks & Backpacks","Women's Wallets & Card Cases","Luggage","Women's Satchels","Men's Shoulder Bags","Umbrellas","Laptop Bags","Waist & Chest bags","Hiking Daypacks","Women's Purse Set","Toiletry Bags","Student Backpacks","Gym Bag","Makeup Bag","Luggage & Travel Bag Accessories","Women's Waist & Chest Bags","Storage Bag","Men's Handbags","Messenger Bags","Passport Covers & Wallets","Briefcases","Hobo Bags"],
  "Patio, Lawn & Garden": ["Outdoor Lighting","Watering & Irrigation","Pools & Hot Tubs","Plant Support & Care","Mowers & Outdoor Power Tools","Outdoor Decor","Planters & Containers","Outdoor Holiday Decor","Pest Control","Gardening Tools","Generators & Portable Power","Backyard Livestock & Bee Care","Greenhouses & Growing Lights","Garden Sculptures","Water Gardens & Ponds","Grills & Outdoor Cooking","Outdoor Carts & Picnic","Canopies, Gazebos & Pergolas","Bird & Wildlife Care","Decorative Garden Stakes","Thermometers & Weather Instruments","Yard Signs & Wall Art","Outdoor Storage","Outdoor Heating & Cooling","Snow Removal","Plants, Seeds & Bulbs"],
  "Arts, Crafts & Sewing": ["Scrapbooking & Stamping","Sewing","Crafting","Painting, Drawing & Art Supplies","Beading & Jewelry Making","Jewelry Casting Supplies","Fabric","Yarn","Party Decorations & Supplies","Gift Wrapping Supplies","Model & Hobby Building","Knitting & Crochet Tools","Organization, Storage & Transport","Jewelry Making Tools & Accessories","Beading Storage & Packaging Supplies","Purse Making Supplies","Needlework","Printmaking"],
  "Electronics": ["Pre-owned Electronics","Headphones, Earbuds & Accessories","Tablets, Laptops & Accessories","Photos & Optics","Audio & Radio","Computer & Accessories","Keyboards, Mice & Accessories","Video Games","Hubs & Adapters","Batteries & Accessories","Data Storage","Computer Components","Laptop & Tablet Stickers","Lighting","GPS, Finders & Accessories","Power Strips","USB Gadgets"],
  "Business, Industry & Science": ["Janitorial & Sanitation Supplies","Professional Medical Supplies","Test, Measure & Inspect","Food Service Equipment & Supplies","Cutting Tools","Retail Store Fixtures & Equipment","Occupational Health & Safety Products","Industrial Electronics","Power Tools","Adhesives & Sealants","Hydraulics, Pneumatics & Plumbing","Commercial Lighting","Packaging & Shipping Supplies","Material Handling","Industrial Hardware","Abrasive & Finishing Products","Lab & Scientific Products","Fasteners","Professional Dental Supplies","Science Education","3D Printers & Accessories","Power Transmission Products","Industrial Materials"],
  "Tools & Home Improvement": ["Rough Plumbing","Hardware","Building Supplies","Wallpaper","Lighting & Ceiling Fans","Bath Fixtures","Power Tool Parts & Accessories","Appliance & Accessories","Electrical","Flashlights","Surveillance Cameras","Kitchen Fixtures","Wall Stickers & Murals","Tool Organizers","Paint Tool","Measuring & Layout Tools","Power Outlets & Accessories","Holiday Lighting","Storage & Home Organization","Welding & Soldering","LED Strip Lights","Safety & Security","Personal Protective Equipment","Adhesives & Sealers","Light Bulbs"],
  "Appliances": ["Fans & Air Conditioners","Electric Massagers","Juicers & Food Processors","Kitchen Appliances","Laundry Supplies","Refrigerators, Freezers & Accessories","Oral Care Electronics","Coffee & Tea Appliances","Personal Care Electronics","Ultrasonic Insect & Pest Repellers","Health & Wellness Monitors","Home Appliances","Ice Maker","Heating Equipment"],
  "Office & School Supplies": ["Office Electronics","Office & School Supplies","Storage & Organization","Writing Supplies & Correction Supplies","Papers, Labels & Indexes","Office Furniture & Parts","Tape, Adhesives & Fasteners","Desk Accessories","Gift Wrap & Crafts","Packing & Shipping","Office Lighting","Stationery Stickers","Desks & Workstations","Greeting Cards & Postcards","Chairs & Sofas","Carrying Cases","Classroom Decorations"],
  "Health & Household": ["Household & Cleaning Supplies","Sexual Wellness Products","Oral Care Products","Stationery & Gift Wrapping Supplies","Foot Health","Home Use Medical Supplies & Equipment","Lighters & Utility Tools","Personal Care Products","Massage Tools","Paper & Plastic","Wellness & Relaxation Products","Mobility & Daily Living Aids","Indoor Insect & Pest Control","Tattoo","Ear Care","Diabetes Care","Incontinence & Ostomy","Household Batteries","Vitamins, Minerals & Supplements","Blood Pressure Monitors","Diet & Sports Nutrition"],
  "Pet Supplies": ["Pet Furniture","Pet Grooming","Pet Toys","Bowls & Feeders","Pet Cleaning","Pet Collars, Leashes & Harnesses","Pet Beds & Bedding","Fish, Reptiles & Amphibians","Carriers & Travel Products","Pet Apparel & Accessories","Small Animals","Birds","Horse Supplies","Training & Behavior","Health Supplies","Pet Memorials & Funerary","Pet Food & Treats"],
  "Cell Phones & Accessories": ["Cases, Holsters & Sleeves","Cell Phones","Maintenance, Upkeep & Repairs","Cables & Adapters","Stands","Chargers","Photo Shooting","Power Banks","Phone Accessories","Decor","Wireless Chargers"],
  "Smart Home": ["Smartwatch & Accessories","Security & Surveillance","Smart Lighting","Smart Devices","Home Entertainment","WIFI & Networking","Smart Doorbells & Locks","Plugs & Outlets","Electric Scooters"],
  "Musical Instruments": ["Microphones","Studio Recording & Stage Equipment","Stringed Instruments","Drums & Percussions","DJ Equipment","Brass & Woodwinds","Keyboards & MIDIs","Guitars","Instrument Accessories","CDs & Vinyl"],
  "Beachwear": ["Women's Bikini Sets","Women's One-pieces","Women's Cover Ups","Women's Tankinis","Curve Tankinis","Curve One-pieces","Curve Cover Ups","Curve Bikini Sets","Women's Rash Guard Swimsuit","Women's Bikini Bottoms","Women's Beachwear sets","Women's Bikini Tops","Women's Beach Shorts","Curve Beachwear Bottoms","Curve Bikini Tops"],
  "Furniture": ["Patio Furniture","Living Room Furniture","Bedroom Furniture","Kitchen & Dining Furniture","Home Office Furniture","Kids' & Baby Furniture","Bathroom Furniture"],
}

async function main() {
  console.log("Seeding parent categories...")

  // Insert parents first
  const { data: parentData, error: parentError } = await supabase
    .from("23_categories")
    .upsert(
      parents.map(name => ({ name })),
      { onConflict: "name", ignoreDuplicates: true },
    )
    .select("id, name")

  if (parentError) {
    console.error("Parent insert error:", parentError.message)
    process.exit(1)
  }

  // Build name → id map (fetch fresh to include pre-existing rows)
  const { data: allParents } = await supabase.from("23_categories").select("id, name").is("parent_id", null)
  const parentMap = new Map<string, string>()
  for (const p of allParents ?? []) parentMap.set(p.name, p.id)

  console.log(`Inserted/found ${parentMap.size} parent categories.`)

  // Insert subcategories
  let subCount = 0
  for (const [parentName, childNames] of Object.entries(subcategories)) {
    const parentId = parentMap.get(parentName)
    if (!parentId) {
      console.warn(`Parent not found: ${parentName}`)
      continue
    }

    const rows = childNames.map(name => ({ name, parent_id: parentId }))
    const { error } = await supabase
      .from("23_categories")
      .upsert(rows, { onConflict: "name", ignoreDuplicates: true })

    if (error) console.warn(`Subcategory insert error for ${parentName}: ${error.message}`)
    else subCount += rows.length
  }

  console.log(`Inserted/found ~${subCount} subcategory rows.`)
  console.log("Seed complete.")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
