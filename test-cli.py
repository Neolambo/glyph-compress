import os
import sys
from django.db import models

class UserProfile(models.Model):
    name = models.CharField(max_length=100)
    
    def get_full_name(self):
        return f"User: {self.name}"
        
def process_data(data):
    print("Processing...")
    return data * 2
