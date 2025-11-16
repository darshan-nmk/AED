"""
Tests for pipeline endpoints
"""
import pytest


def test_create_pipeline(client, auth_headers):
    """Test pipeline creation"""
    pipeline_data = {
        "name": "Test Pipeline",
        "description": "A test pipeline",
        "nodes": [
            {
                "id": "node1",
                "type": "SOURCE",
                "subtype": "CSV_SOURCE",
                "config": {"file_path": "/data/test.csv"},
                "position_x": 100,
                "position_y": 200
            }
        ],
        "edges": []
    }
    
    response = client.post("/api/v1/pipelines/", json=pipeline_data, headers=auth_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Pipeline"
    assert data["description"] == "A test pipeline"
    assert "id" in data


def test_create_pipeline_unauthorized(client):
    """Test pipeline creation without auth"""
    pipeline_data = {
        "name": "Test Pipeline",
        "nodes": [],
        "edges": []
    }
    
    response = client.post("/api/v1/pipelines/", json=pipeline_data)
    assert response.status_code == 403


def test_list_pipelines(client, auth_headers):
    """Test listing pipelines"""
    # Create a pipeline first
    pipeline_data = {
        "name": "Pipeline 1",
        "nodes": [],
        "edges": []
    }
    client.post("/api/v1/pipelines/", json=pipeline_data, headers=auth_headers)
    
    # List pipelines
    response = client.get("/api/v1/pipelines/", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Pipeline 1"


def test_get_pipeline(client, auth_headers):
    """Test getting a specific pipeline"""
    # Create pipeline
    pipeline_data = {
        "name": "Get Test Pipeline",
        "nodes": [],
        "edges": []
    }
    create_response = client.post("/api/v1/pipelines/", json=pipeline_data, headers=auth_headers)
    pipeline_id = create_response.json()["id"]
    
    # Get pipeline
    response = client.get(f"/api/v1/pipelines/{pipeline_id}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == pipeline_id
    assert data["name"] == "Get Test Pipeline"


def test_update_pipeline(client, auth_headers):
    """Test updating a pipeline"""
    # Create pipeline
    pipeline_data = {
        "name": "Original Name",
        "nodes": [],
        "edges": []
    }
    create_response = client.post("/api/v1/pipelines/", json=pipeline_data, headers=auth_headers)
    pipeline_id = create_response.json()["id"]
    
    # Update pipeline
    update_data = {
        "name": "Updated Name",
        "description": "New description"
    }
    response = client.put(f"/api/v1/pipelines/{pipeline_id}", json=update_data, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "New description"


def test_delete_pipeline(client, auth_headers):
    """Test deleting a pipeline"""
    # Create pipeline
    pipeline_data = {
        "name": "To Delete",
        "nodes": [],
        "edges": []
    }
    create_response = client.post("/api/v1/pipelines/", json=pipeline_data, headers=auth_headers)
    pipeline_id = create_response.json()["id"]
    
    # Delete pipeline
    response = client.delete(f"/api/v1/pipelines/{pipeline_id}", headers=auth_headers)
    
    assert response.status_code == 204
    
    # Verify deleted
    get_response = client.get(f"/api/v1/pipelines/{pipeline_id}", headers=auth_headers)
    assert get_response.status_code == 404
