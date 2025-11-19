from pydantic import BaseModel
from typing import Dict, List, Optional, Literal
from datetime import datetime

class ReactionData(BaseModel):
    """Represents reactions of a message with emoji to username mpping"""
    emoji: Dict[str, List[str]] = {} #{emoji: [username]}

class Message(BaseModel):
    """Base message model with reactions support"""
    id: str
    type: Literal["message", "join", "leave", "reaction", "add_reaction", "remove_reaction"]
    user: str
    content: Optional[str] = None
    timestamp: datetime
    reactions: ReactionData = ReactionData()
    online: Optional[List[str]] = None #for join/leave message

class MessageBrodcast(BaseModel):
    """Model for message sent to websocket clients"""
    type: Literal["message", "join", "leave", "reaction", "add_reaction", "remove_reaction"]
    user: str
    content: Optional[str] = None
    message_id: Optional[str] = None #for reaction uodates
    reactions: Optional[ReactionData] = None
    emoji: Optional[str] = None #for reaction uodates
    users: Optional[List[str]] = None
    timestamp: datetime

class ReactionRequest(BaseModel):
    """Model for incoming reaction requests"""
    type: Literal["reaction"]
    message_id: str
    emoji: str
    action: Literal["add", "remove"]

class AddReactionRequest(BaseModel):
    """Model for incoming add_reaction requests"""
    type: Literal["add_reaction"]
    message_id: str
    emoji: str

class RemoveReactionRequest(BaseModel):
    """Model for incoming remove_reaction requests"""
    type: Literal["remove_reaction"]
    message_id: str
    emoji: str

class MessageRequest(BaseModel):
    """Model for incoming message requests"""  
    type: Literal["message"]  
    content: str
