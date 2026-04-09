... 
erDiagram
    USERS {
        string _id PK
        string name
        string email
        string passwordHash
        string role
        string phone
        string profileImage
        string[] favorites
        date createdAt
        date updatedAt
    }
    PROPERTIES {
        string _id PK
        string title
        string type
        string status
        number price
        string currency
        string location
        string features
        string[] images
        string[] videos
        string[] models3D
        string description
        string ownerId FK
        number viewsCount
        date createdAt
        date updatedAt
    }
    INQUIRIES {
        string _id PK
        string propertyId FK
        string senderId FK
        string receiverId FK
        string message
        string status
        date createdAt
    }
    MODELS3D {
        string _id PK
        string propertyId FK
        string url
        string format
        number sizeMB
        string viewerSettings
        date createdAt
    }
    REVIEWS {
        string _id PK
        string userId FK
        string targetUserId FK
        number rating
        string comment
        date createdAt
    }
    USERS ||--o{ PROPERTIES : owns
    PROPERTIES ||--o{ INQUIRIES : related_to
    USERS ||--o{ INQUIRIES : communicates
    PROPERTIES ||--o| MODELS3D : has
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ REVIEWS : receives 
...
