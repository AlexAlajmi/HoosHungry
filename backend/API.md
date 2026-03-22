# HoosHungry Backend API

## Base URL

Local backend base URL:

```txt
http://localhost:5009/api
```

If the frontend is running separately, it should call routes like:

```txt
METHOD http://localhost:5009/api/...
```

## Endpoints

### `POST /api/auth/signup`

Creates a marketplace account.

Request body:

```json
{
  "email": "student@virginia.edu",
  "name": "Alex Student",
  "password": "password123",
  "role": "Buyer",
  "headline": "Happy to trade meal exchanges."
}
```

### `POST /api/auth/login`

Logs a user in with email and password.

Request body:

```json
{
  "email": "student@virginia.edu",
  "password": "password123"
}
```

### `GET /api/demo/state`

Returns the full marketplace state for the demo UI:

- sellers
- buyers
- offers
- orders
- notifications
- withdrawals
- metrics

Frontend example:

```js
fetch('http://localhost:5009/api/demo/state')
```

### `POST /api/sellers/{sellerId}/availability`

Marks a seller as available or unavailable for meal exchange.

Request body:

```json
{
  "isAvailable": true
}
```

Frontend example:

```js
fetch('http://localhost:5009/api/sellers/seller-1/availability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ isAvailable: true }),
})
```

### `POST /api/offers`

Broadcasts a buyer's offered price to all currently available sellers.

Request body:

```json
{
  "buyerId": "buyer-1",
  "item": "Burrito",
  "location": "Newcomb Hall",
  "price": 12.5
}
```

Frontend example:

```js
fetch('http://localhost:5009/api/offers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ buyerId: 'buyer-1', price: 12.5 }),
})
```

### `POST /api/offers/{offerId}/decision`

Lets a seller accept or decline an offer.

Request body:

```json
{
  "accept": true
}
```

Frontend example:

```js
fetch('http://localhost:5009/api/offers/OFFER_ID/decision', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accept: true }),
})
```

### `POST /api/orders/{orderId}/confirm`

Confirms the meal exchange order in the mocked GrubHub flow.

Request body:

```json
{
  "confirmationNote": "Seller submitted the meal exchange in mock GrubHub."
}
```

Frontend example:

```js
fetch('http://localhost:5009/api/orders/ORDER_ID/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    confirmationNote: 'Seller submitted the meal exchange in mock GrubHub.'
  }),
})
```

### `POST /api/orders/{orderId}/tracking`

Updates meal status and optional ETA.

Supported status values:

- `AwaitingConfirmation`
- `Preparing`
- `ReadySoon`
- `ReadyForPickup`
- `Completed`
- `Declined`

Request body:

```json
{
  "status": "ReadySoon",
  "detail": "Order should be ready in 10 minutes.",
  "estimatedReadyAtUtc": "2026-03-21T21:10:00Z"
}
```

Frontend example:

```js
fetch('http://localhost:5009/api/orders/ORDER_ID/tracking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'ReadySoon',
    detail: 'Order should be ready in 10 minutes.',
    estimatedReadyAtUtc: '2026-03-21T21:10:00Z',
  }),
})
```

### `POST /api/wallets/{sellerId}/withdraw`

Withdraws funds from the seller's mocked wallet balance.

Request body:

```json
{
  "amount": 10.0
}
```

Frontend example:

```js
fetch('http://localhost:5009/api/wallets/seller-1/withdraw', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 10.0 }),
})
```

## Frontend Flow

1. Call `GET /api/demo/state` when the page loads.
2. When a user takes an action, call the matching `POST` endpoint.
3. Refresh the UI by calling `GET /api/demo/state` again.

That gives the frontend one main read endpoint and several write endpoints.
