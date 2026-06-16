/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: OTP authentication
 *   - name: Properties
 *     description: Property listings — search, create, manage
 *   - name: Projects
 *     description: Builder projects
 *   - name: Cities
 *     description: Cities and localities
 *   - name: Leads
 *     description: Enquiry and lead management
 *   - name: Users
 *     description: User profile and shortlists
 *   - name: Location
 *     description: Nearby search using PostGIS
 */

// ============================================================
// AUTH
// ============================================================

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOtpRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid phone number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *     responses:
 *       200:
 *         description: Login successful — returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired OTP
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */

// ============================================================
// PROPERTIES
// ============================================================

/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Search and filter properties
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         example: bhubaneswar
 *       - in: query
 *         name: locality
 *         schema: { type: string }
 *         example: patia
 *       - in: query
 *         name: bhk
 *         schema: { type: string }
 *         description: Single or comma-separated e.g. 2,3
 *         example: "2,3"
 *       - in: query
 *         name: listingType
 *         schema: { type: string, enum: [BUY, RENT, PG] }
 *       - in: query
 *         name: propertyType
 *         schema: { type: string, enum: [APARTMENT, VILLA, PLOT, INDEPENDENT_HOUSE] }
 *       - in: query
 *         name: furnishingStatus
 *         schema: { type: string, enum: [UNFURNISHED, SEMI_FURNISHED, FULLY_FURNISHED] }
 *       - in: query
 *         name: possessionStatus
 *         schema: { type: string, enum: [READY_TO_MOVE, UNDER_CONSTRUCTION, NEW_LAUNCH] }
 *       - in: query
 *         name: minPrice
 *         schema: { type: string }
 *         example: "5000000"
 *       - in: query
 *         name: maxPrice
 *         schema: { type: string }
 *         example: "10000000"
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [price_asc, price_desc, latest, popular] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: List of properties with pagination
 */

/**
 * @swagger
 * /properties/{slug}:
 *   get:
 *     summary: Get property detail by slug
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: 3bhk-flat-sale-patia-bhubaneswar-001
 *     responses:
 *       200:
 *         description: Full property detail
 *       404:
 *         description: Property not found
 */

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Create a new property listing
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, propertyType, listingType, cityId, localityId, price, furnishingStatus, possessionStatus]
 *             properties:
 *               title:            { type: string,  example: "3 BHK Flat for Sale in Patia" }
 *               propertyType:     { type: string,  enum: [APARTMENT, VILLA, PLOT] }
 *               listingType:      { type: string,  enum: [BUY, RENT, PG] }
 *               cityId:           { type: integer, example: 1 }
 *               localityId:       { type: integer, example: 1 }
 *               price:            { type: string,  example: "8200000" }
 *               bhk:              { type: integer, example: 3 }
 *               bathrooms:        { type: integer, example: 2 }
 *               furnishingStatus: { type: string,  enum: [UNFURNISHED, SEMI_FURNISHED, FULLY_FURNISHED] }
 *               possessionStatus: { type: string,  enum: [READY_TO_MOVE, UNDER_CONSTRUCTION, NEW_LAUNCH] }
 *               features:         { type: string,  example: '["Gym","Parking"]' }
 *               overlooking:      { type: string,  example: '["Garden"]' }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Property created successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /properties/{id}:
 *   patch:
 *     summary: Update a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:            { type: string }
 *               description:      { type: string }
 *               furnishingStatus: { type: string }
 *     responses:
 *       200:
 *         description: Property updated
 *       403:
 *         description: Forbidden — not your property
 *   delete:
 *     summary: Soft delete a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Property removed
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /properties/{id}/images:
 *   post:
 *     summary: Add images to existing property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Images uploaded
 */

/**
 * @swagger
 * /properties/images/{imageId}:
 *   delete:
 *     summary: Delete a single property image
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Image deleted
 */

// ============================================================
// CITIES
// ============================================================

/**
 * @swagger
 * /cities:
 *   get:
 *     summary: Get all cities
 *     tags: [Cities]
 *     parameters:
 *       - in: query
 *         name: popular
 *         schema: { type: boolean }
 *         description: Return only popular cities
 *     responses:
 *       200:
 *         description: List of cities with property counts
 */

/**
 * @swagger
 * /cities/search:
 *   get:
 *     summary: Autocomplete search across cities and localities
 *     tags: [Cities]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *         example: pat
 *     responses:
 *       200:
 *         description: Matching cities and localities
 */

/**
 * @swagger
 * /cities/{slug}:
 *   get:
 *     summary: Get city by slug
 *     tags: [Cities]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: bhubaneswar
 *     responses:
 *       200:
 *         description: City details
 *       404:
 *         description: City not found
 */

/**
 * @swagger
 * /cities/{slug}/localities:
 *   get:
 *     summary: Get all localities in a city
 *     tags: [Cities]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: bhubaneswar
 *     responses:
 *       200:
 *         description: List of localities with property counts
 */

// ============================================================
// LEADS
// ============================================================

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Submit an enquiry (works for guests and logged-in users)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitLeadRequest'
 *     responses:
 *       201:
 *         description: Enquiry submitted successfully
 *       400:
 *         description: Validation error or inactive property
 *       409:
 *         description: Duplicate enquiry within 24 hours
 */

/**
 * @swagger
 * /leads/my:
 *   get:
 *     summary: Get current user's submitted enquiries
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's leads
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /leads/agent:
 *   get:
 *     summary: Get leads assigned to agent
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [NEW, CONTACTED, SITE_VISIT_SCHEDULED, NEGOTIATING, CONVERTED, LOST] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of agent leads
 */

/**
 * @swagger
 * /leads/{id}/status:
 *   patch:
 *     summary: Update lead status
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:     { type: string, enum: [NEW, CONTACTED, SITE_VISIT_SCHEDULED, NEGOTIATING, CONVERTED, LOST] }
 *               notes:      { type: string }
 *               followUpAt: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Lead status updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */

// ============================================================
// PROJECTS
// ============================================================

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Search and filter projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: possessionStatus
 *         schema: { type: string, enum: [READY_TO_MOVE, UNDER_CONSTRUCTION, NEW_LAUNCH] }
 *       - in: query
 *         name: isFeatured
 *         schema: { type: boolean }
 *       - in: query
 *         name: isTrending
 *         schema: { type: boolean }
 *       - in: query
 *         name: minPrice
 *         schema: { type: string }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [price_asc, price_desc, latest, popular] }
 *     responses:
 *       200:
 *         description: List of projects with pagination
 */

/**
 * @swagger
 * /projects/featured:
 *   get:
 *     summary: Get featured projects for homepage
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         example: bhubaneswar
 *     responses:
 *       200:
 *         description: Up to 6 featured projects
 */

/**
 * @swagger
 * /projects/builder/{builderSlug}:
 *   get:
 *     summary: Get all projects by a builder
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: builderSlug
 *         required: true
 *         schema: { type: string }
 *         example: kalinga-constructions
 *     responses:
 *       200:
 *         description: Builder details and their projects
 *       404:
 *         description: Builder not found
 */

/**
 * @swagger
 * /projects/{slug}:
 *   get:
 *     summary: Get full project detail by slug
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: kalinga-greenfields-patia
 *     responses:
 *       200:
 *         description: Full project detail with amenities, floor plans, reviews
 *       404:
 *         description: Project not found
 */

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - builderName
 *               - cityName
 *               - localityName
 *               - stateId
 *               - possessionStatus
 *             properties:
 *               name:
 *                 type: string
 *                 example: Kalinga Greenfields
 *               builderName:
 *                 type: string
 *                 example: Kalinga Constructions
 *               cityName:
 *                 type: string
 *                 example: Bhubaneswar
 *               localityName:
 *                 type: string
 *                 example: Patia
 *               stateId:
 *                 type: integer
 *                 example: 1
 *               minPrice:
 *                 type: string
 *                 example: "5000000"
 *               possessionStatus:
 *                 type: string
 *                 enum:
 *                   - READY_TO_MOVE
 *                   - UNDER_CONSTRUCTION
 *                   - NEW_LAUNCH
 *               description:
 *                 type: string
 *               configs:
 *                 type: string
 *                 description: JSON array of project configurations
 *                 example: '[{"unitType":"2 BHK","buildAreaRange":"875-1050","price":"6800000","units":60}]'
 *               amenities:
 *                 type: string
 *                 example: '["Gym","Pool","Parking"]'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Project created successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /projects/{id}/configs:
 *   patch:
 *     summary: Replace project configurations
 *     description: Replaces all existing configurations of a project with the provided config array.
 *     tags:
 *       - Projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configs
 *             properties:
 *               configs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - unitType
 *                   properties:
 *                     unitType:
 *                       type: string
 *                       example: "3 BHK"
 *                     buildAreaRange:
 *                       type: string
 *                       example: "1200-1500"
 *                     carpetArea:
 *                       type: string
 *                       example: "1050"
 *                     bedRoom:
 *                       type: string
 *                       example: "3"
 *                     livingArea:
 *                       type: string
 *                       example: "250"
 *                     kitchen:
 *                       type: string
 *                       example: "120"
 *                     balconies:
 *                       type: string
 *                       example: "2"
 *                     floorHeight:
 *                       type: string
 *                       example: "10 ft"
 *                     flooring:
 *                       type: string
 *                       example: "Vitrified Tiles"
 *                     facing:
 *                       type: string
 *                       example: "East"
 *                     pricePerArea:
 *                       type: string
 *                       example: "6500"
 *                     price:
 *                       type: number
 *                       example: 8500000
 *                     units:
 *                       type: integer
 *                       example: 50
 *     responses:
 *       200:
 *         description: Project configs updated successfully
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:             { type: string }
 *               builderName:       { type: string }
 *               startingPrice:     { type: string }
 *               possessionStatus:  { type: string }
 *               description:       { type: string }
 *               amenities:         { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Project not found
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       403:
 *         description: Forbidden — not authorized
 *       404:
 *         description: Project not found
 */

/**
 * @swagger
 * /projects/{id}/images:
 *   post:
 *     summary: Add images to an existing project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Project not found
 */

/**
 * @swagger
 * /projects/{projectId}/properties:
 *   post:
 *     summary: Create property for a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bhk, propertyType, superArea, carpetArea, pricePerSqFt, ownerId]
 *             properties:
 *               bhk:             { type: integer, example: 2, description: "Number of bedrooms" }
 *               propertyType:    { type: string, enum: [APARTMENT, VILLA, PLOT, BUILDER_FLOOR], example: "APARTMENT" }
 *               superArea:       { type: number, example: 1200, description: "Super built-up area in sq.ft" }
 *               carpetArea:      { type: number, example: 1000, description: "Carpet area in sq.ft" }
 *               balconies:       { type: integer, example: 2 }
 *               floorNumber:     { type: integer, example: 5, description: "Floor height (0-based)" }
 *               facing:          { type: string, enum: [North, South, East, West, North-East, North-West, South-East, South-West] }
 *               pricePerSqFt:    { type: number, example: 4500, description: "Price per sq.ft" }
 *               ownerId:         { type: integer, example: 1, description: "User ID of the property owner" }
 *               builderId:       { type: integer, example: 1, description: "User ID of the property owner" }
 *               features:        { type: array, items: { type: string }, example: ["Balcony", "Kitchen", "Parking"] }
 *               title:           { type: string, example: "2BHK Apartment in XYZ Project" }
 *               description:     { type: string, example: "Beautiful apartment with modern amenities" }
 *     responses:
 *       201:
 *         description: Property created successfully with auto-filled location and builder info
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project or Builder not found
 */

// ============================================================
// USERS
// ============================================================

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile with activity counts
 *   patch:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:      { type: string, example: "Rahul Mohanty" }
 *               email:     { type: string, example: "rahul@gmail.com" }
 *               avatarUrl: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *       409:
 *         description: Email already in use
 */

/**
 * @swagger
 * /users/me/saved/properties:
 *   get:
 *     summary: Get shortlisted properties
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved properties
 */

/**
 * @swagger
 * /users/me/saved/properties/{propertyId}:
 *   post:
 *     summary: Toggle save/unsave a property
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: "{ saved: true } or { saved: false }"
 */

// ============================================================
// LOCATION
// ============================================================

/**
 * @swagger
 * /location/properties/nearby:
 *   get:
 *     summary: Find properties within a radius
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         example: 20.3541
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         example: 85.8191
 *       - in: query
 *         name: radius
 *         schema: { type: number, default: 5 }
 *         description: Radius in km (max 50)
 *       - in: query
 *         name: listingType
 *         schema: { type: string, enum: [BUY, RENT, PG] }
 *     responses:
 *       200:
 *         description: Properties sorted by distance
 */

/**
 * @swagger
 * /location/projects/nearby:
 *   get:
 *     summary: Find projects within a radius
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         example: 20.3541
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         example: 85.8191
 *       - in: query
 *         name: radius
 *         schema: { type: number, default: 10 }
 *     responses:
 *       200:
 *         description: Projects sorted by distance
 */

/**
 * @swagger
 * /location/localities/nearby:
 *   get:
 *     summary: Find localities near a point with property counts
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         example: 20.3541
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         example: 85.8191
 *     responses:
 *       200:
 *         description: Nearby localities sorted by distance
 */

/**
 * @swagger
 * /location/distance:
 *   get:
 *     summary: Get distance between two coordinates
 *     tags: [Location]
 *     parameters:
 *       - in: query
 *         name: lat1
 *         required: true
 *         schema: { type: number }
 *         example: 20.3541
 *       - in: query
 *         name: lng1
 *         required: true
 *         schema: { type: number }
 *         example: 85.8191
 *       - in: query
 *         name: lat2
 *         required: true
 *         schema: { type: number }
 *         example: 20.2548
 *       - in: query
 *         name: lng2
 *         required: true
 *         schema: { type: number }
 *         example: 85.7760
 *     responses:
 *       200:
 *         description: "{ meters: 11234, label: '11.2 km' }"
 */

export {};